package main

import (
	"chatapp/cron"
	"chatapp/databases"
	"chatapp/dto"
	"chatapp/internal/handler"
	"chatapp/internal/helper"
	"chatapp/internal/middleware"
	"chatapp/internal/repositories"
	"chatapp/internal/services"
	"chatapp/internal/services_cached"
	"fmt"
	"log"
	"os"
	"strings"

	jwtWare "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/golang-jwt/jwt/v5"
)

func main() {
	db, err := databases.InitDB()
	if err != nil {
		panic("Gagal init db")
	}

	rdb, err := databases.InitRedis()
	if err != nil {
		panic("Gagal init redis")
	}

	helper.InitValidator()

	app := fiber.New(fiber.Config{
		BodyLimit: 10 * 1024 * 1024,
	})
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			allowed := []string{
				os.Getenv("FRONTEND_URL"),
				os.Getenv("FRONTEND_JOIN_URL"),
				os.Getenv("BACKEND_URL"),
				os.Getenv("SUPABASE_URL"),
				"http://localhost:8000",
				"http://localhost:5173",
				"http://localhost:3000",
			}

			for _, o := range allowed {
				if origin == o {
					return true
				}

				if origin == strings.TrimSuffix(o, "/") {
					return true
				}
			}

			return false
		},
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		ExposeHeaders:    "Content-Length",
		AllowCredentials: true,
	}))
	app.Static("/public", "./public")

	jwtWare := jwtWare.New(jwtWare.Config{
		SigningKey: jwtWare.SigningKey{Key: []byte(os.Getenv("JWT_KEY"))},
		SuccessHandler: func(c *fiber.Ctx) error {
			user := c.Locals("user").(*jwt.Token)
			claims := user.Claims.(jwt.MapClaims)

			if id, ok := claims["ID"].(float64); ok {
				c.Locals("user_id", uint(id))
			}

			if accessUUID, ok := claims["access_uuid"].(string); ok {
				c.Locals("access_uuid", accessUUID)
			}

			if refreshUUID, ok := claims["refresh_uuid"].(string); ok {
				c.Locals("refresh_uuid", refreshUUID)
			}

			accessUUID := claims["access_uuid"].(string)

			key := "access:" + accessUUID
			val, err := rdb.Exists(c.Context(), key).Result()
			if err != nil || val == 0 {
				return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Session tidak valid"))
			}

			return c.Next()
		},
		ErrorHandler: func(ctx *fiber.Ctx, err error) error {
			log.Printf("=== JWT ERROR === %v", err)
			return ctx.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Unauthorized, silahkan refresh token atau login ulang"))
		},
	})

	hub := dto.NewHub()
	go hub.Run()

	storageService := services.NewSupabaseStorage()

	userRepository := repositories.NewUser(db)
	userService := services.NewUser(userRepository, hub)

	authRepository := repositories.NewAuth(db)
	authService := services.NewAuth(authRepository, userRepository, userService, storageService)
	cachedAuthService := services_cached.NewCachedAuthServices(authService, authRepository, rdb)

	roomRepository := repositories.NewRoom(db)
	roomService := services.NewRoomServices(hub, roomRepository, userRepository, storageService)
	cachedRoomServices := services_cached.NewCachedRoomServices(roomService, rdb)

	handler.NewAuth(app, cachedAuthService, userService, jwtWare)
	handler.NewUser(app, userService, storageService, jwtWare)
	handler.NewRoom(app, roomService, cachedRoomServices, storageService, jwtWare)
	handler.NewWebSocket(app, hub, roomService, cachedRoomServices, userService, middleware.WebsocketMiddleware(rdb))

	go cron.RefreshTokenJob(userService)
	go cron.ResetTokenJob(userService)
	go cron.NotificationJob(userService)

	fmt.Printf("Server Berjalan Cuy")
	log.Fatal(app.Listen(":8000"))
}
