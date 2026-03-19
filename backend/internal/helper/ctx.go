package helper

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetCtx(c *fiber.Ctx) (context.Context, context.CancelFunc) {
	ctx := c.Context()
	return context.WithTimeout(ctx, 30*time.Second)
}
