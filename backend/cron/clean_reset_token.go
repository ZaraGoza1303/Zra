package cron

import (
	"chatapp/core"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

func ResetTokenJob(userServices core.UserServices){
	c := cron.New(cron.WithSeconds())

	c.AddFunc("@daily", func() {
		fmt.Println("Cleaning up reset token...")
		ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
		defer cancel()

		if err := userServices.CleanResetToken(ctx); err != nil {
			log.Printf("[CRON] failed: %v", err)
		}
	})

	c.Start()
}