package core

import (
	"mime/multipart"

	storage_go "github.com/supabase-community/storage-go"
)

type StorageService interface {
	GetStorageClient() *storage_go.Client
	UploadFile(typePath string, fileHeader *multipart.FileHeader) (string, error)
	UpdateFile(typePath string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error)
	RemoveFile(typePath string, fileName string) error
}
