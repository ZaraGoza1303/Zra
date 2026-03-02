package helper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

var ValidateVar *validator.Validate

func InitValidator() {
	ValidateVar = validator.New()

	ValidateVar.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]

		if name == "-" {
			return ""
		}

		return name
	})
}

func Validate[T any](data T) map[string]string {
	err := ValidateVar.Struct(data)
	if err != nil {
		response := map[string]string{}

		for _, v := range err.(validator.ValidationErrors) {
			response[v.Field()] = TranslateTag(v)
		}
		return response
	}

	return nil
}

func TranslateTag(field validator.FieldError) string {
	switch field.Tag() {
	case "required":
		return fmt.Sprintf("Field %s wajib di isi", field.Field())
	}

	return "Validation Failed"
}

func StrictBodyParser(c *fiber.Ctx, v interface{}) error {
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}
