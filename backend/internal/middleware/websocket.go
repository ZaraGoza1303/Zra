package middleware

import (
	"chatapp/dto"
	"os"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
)

func WebsocketMiddleware(rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := c.Query("token")
		if token == "" {
			token = c.Get("Authorization")
			if len(token) > 7 && token[:7] == "Bearer " {
				token = token[7:]
			}
		}

		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("No Token Provided"))
		}

		jwtToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_KEY")), nil
		})

		if err != nil || !jwtToken.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Invalid Token"))
		}

		claims, ok := jwtToken.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Invalid Sessions"))
		}

		accessUUID, ok := claims["access_uuid"].(string)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Invalid Sessions"))
		}

		key := "access:" + accessUUID
		val, err := rdb.Exists(c.Context(), key).Result()
		if err != nil || val == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(dto.SendErrorResponse("Session tidak valid"))
		}

		if id, ok := claims["ID"].(float64); ok {
			c.Locals("user_id", uint(id))
		}

		c.Locals("user", claims)

		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}

		return c.Next()
	}
}
