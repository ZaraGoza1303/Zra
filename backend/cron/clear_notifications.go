package cron

import (
	"chatapp/core"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
)

func NotificationJob(userServices core.UserServices){
	c := cron.New(cron.WithSeconds())

	c.AddFunc("@daily",func(){
		fmt.Println("Cleaning up notifications...")
		ctx, cancel := context.WithTimeout(context.Background(), 10 * time.Second)
		defer cancel()

		if err := userServices.CleanNotifications(ctx); err != nil {
			log.Printf("[CRON] failed: %v", err)
		}
	})

	c.Start()
}