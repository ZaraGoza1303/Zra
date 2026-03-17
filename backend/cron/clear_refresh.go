package cron

import (
	"chatapp/core"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

func RefreshTokenJob(userServices core.UserServices){
	c := cron.New(cron.WithSeconds())

	c.AddFunc("@weekly", func() {
		fmt.Println("Cleaning up refresh token...")
		ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
		defer cancel()

		if err := userServices.CleanRefreshToken(ctx); err != nil {
			log.Printf("[CRON] failed: %v", err)
		}
	})

	c.Start()
}