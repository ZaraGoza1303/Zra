package core

import (
	"mime/multipart"
)

type LocalStorageServices interface {
	UploadFile(typePath string, fileHeader *multipart.FileHeader) (string, error)
	UpdateFile(typePath string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error)
	RemoveFile(typePath string, fileName string) error
}

type SupabaseStorageService interface {
	UploadFile(bucketName string, fileHeader *multipart.FileHeader) (string, error)
	UpdateFile(bucketName string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error)
	RemoveFile(bucketName string, fileName string) error
}