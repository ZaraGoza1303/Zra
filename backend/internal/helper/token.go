package helper

import (
	"chatapp/dto"
	"crypto/rand"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func GenerateCustomToken(n int) (string, error) {
	charset := os.Getenv("PASSWORD_RESET_TOKEN")

	result := make([]byte, n)
	randomBytes := make([]byte, n)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}

	for i := 0; i < n; i++ {
		result[i] = charset[randomBytes[i]%byte(len(charset))]
	}
	return string(result), nil
}

func GenerateJwtToken(req dto.GenerateJwtRequest) (*dto.GenerateJwtResponse, error) {
	accessUUID := uuid.New().String()
	refreshUUID := uuid.New().String()

	accessClaims := jwt.MapClaims{
		"ID":           req.UserID,
		"access_uuid":  accessUUID,
		"refresh_uuid": refreshUUID,
		"exp":          time.Now().Add(req.AccessDuration).Unix(),
	}

	refreshClaims := jwt.MapClaims{
		"ID":           req.UserID,
		"access_uuid":  accessUUID,
		"refresh_uuid": refreshUUID,
		"exp":          time.Now().Add(req.RefreshDuration).Unix(),
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	signedAccessToken, err := accessToken.SignedString([]byte(req.JwtAccessKey))
	if err != nil {
		return nil, err
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	signedRefreshToken, err := refreshToken.SignedString([]byte(req.JwtRefreshKey))
	if err != nil {
		return nil, err
	}

	return &dto.GenerateJwtResponse{
		SignedAccessKey:  signedAccessToken,
		SignedRefreshKey: signedRefreshToken,
		AccessUUID:       accessUUID,
		RefreshUUID:      refreshUUID,
	}, nil
}
