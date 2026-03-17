package databases

import (
	"chatapp/internal/models"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB() (*gorm.DB, error) {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		os.Getenv("DB_HOST_SUPABASE"), os.Getenv("DB_PORT_SUPABASE"), os.Getenv("DB_USER_SUPABASE"), os.Getenv("DB_PASSWORD_SUPABASE"),
		os.Getenv("DB_NAME_SUPABASE"), os.Getenv("DB_SSL_MODE_SUPABASE"), os.Getenv("DB_TIMEZONE_SUPABASE"))

	newLogger := logger.New(
	log.New(os.Stdout, "\r\n", log.LstdFlags), 
	logger.Config{
		SlowThreshold:              time.Second,   
		LogLevel:                   logger.Warn, 
		Colorful:                  true,        
	},
	)

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN: dsn,
		PreferSimpleProtocol: true,
	}), &gorm.Config{
		Logger: newLogger,
	})

	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&models.User{}, &models.Friend{},&models.PasswordReset{}, &models.UserToken{}, &models.Room{}, &models.RoomMember{}, &models.Message{}, &models.Notification{})

	return db, nil
}
