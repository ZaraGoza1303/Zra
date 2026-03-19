package helper

import (
	"os"

	"github.com/golang-jwt/jwt/v5"
)

func ParseRefreshToken(token string) (uint, string, string, bool, error) {
	jwtToken, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_REFRESH_KEY")), nil
	})

	if err != nil || !jwtToken.Valid {
		return 0, "", "", false, ErrRefreshTokenNotValid
	}

	claims, ok := jwtToken.Claims.(jwt.MapClaims)
	if !ok {
		return 0, "", "", false, ErrRefreshTokenNotValid
	}

	// Extract user ID
	userID, ok := claims["ID"].(float64)
	if !ok {
		return 0, "", "", false, ErrRefreshTokenNotValid
	}

	// Extract access UUID
	accessUUID, ok := claims["access_uuid"].(string)
	if !ok {
		return 0, "", "", false, ErrRefreshTokenNotValid
	}

	// Extract refresh UUID
	refreshUUID, ok := claims["refresh_uuid"].(string)
	if !ok {
		return 0, "", "", false, ErrRefreshTokenNotValid
	}

	// Extract isPersistent flag
	var isPersistent bool
	if rem, ok := claims["rem"]; ok {
		if val, bOk := rem.(bool); bOk {
			isPersistent = val
		}
	}

	return uint(userID), accessUUID, refreshUUID, isPersistent, nil
}
