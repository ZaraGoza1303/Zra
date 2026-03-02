package helper

import (
	"crypto/rand"
	"crypto/tls"
	"log"
	"math/big"
	"os"
	"strconv"

	"github.com/joho/godotenv"
	"gopkg.in/gomail.v2"
)

func SendEmail(isHTML bool, body string, emails ...string) error {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	host := os.Getenv("SMTP_HOST")
	portStr := os.Getenv("SMTP_PORT")
	port, _ := strconv.Atoi(portStr)
	from := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASSWORD")

	var to []string
	for _, email := range emails {
		to = append(to, email)
	}

	m := gomail.NewMessage()
	m.SetHeader("From", "admin@development.com")
	m.SetHeader("To", to...)
	m.SetHeader("Subject", "Verification")

	if isHTML {
		m.SetBody("text/html", body)
	} else {
		m.SetBody("text/plain", body)
	}

	d := gomail.NewDialer(host, port, from, pass)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}
	if err := d.DialAndSend(m); err != nil {
		return err
	}

	return nil
}

func GenerateOTP(length int) (string, error) {
	seed := "0123456789"
	byteSlice := make([]byte, length)

	for i := 0; i < length; i++ {
		max := big.NewInt(int64(len(seed)))
		num, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		byteSlice[i] = seed[num.Int64()]
	}
	return string(byteSlice), nil
}
