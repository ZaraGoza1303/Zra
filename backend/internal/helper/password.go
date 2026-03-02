package helper

import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

func CompareHashedPassword(hash string, passwordReq string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(passwordReq))
	return err
}
