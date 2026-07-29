package services

import (
	"chatapp/internal/helper"
	"context"
	"mime/multipart"
)

func (r *roomServices) UploadFile(ctx context.Context, fileHeader *multipart.FileHeader) (string, error) {
	fileName, err := r.storageServices.UploadFile("uploads", fileHeader)
	if err != nil {
		return "", err
	}

	fileUrl := helper.NormalizeImagePath(fileName, r.backendUrl, r.uploadsPath)
	return fileUrl, nil
}
