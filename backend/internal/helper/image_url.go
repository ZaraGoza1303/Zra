package helper

import (
	"fmt"
	"os"
	"strings"
)

func NormalizeImagePath(path, backendUrl, storagePath string) string {
	if path == "" {
		return ""
	}

	if strings.HasPrefix(path, "http://") || strings.HasPrefix(path, "https://") {
		return path
	}

	supabaseUrl := strings.TrimSuffix(os.Getenv("SUPABASE_URL"), "/")
	bucket := strings.Trim(storagePath, "/")
	bucket = strings.TrimPrefix(bucket, "public/")
	fileName := strings.TrimPrefix(path, "/")

	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", supabaseUrl, bucket, fileName)
}
