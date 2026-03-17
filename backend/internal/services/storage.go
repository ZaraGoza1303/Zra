package services

import (
	"chatapp/core"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	storage_go "github.com/supabase-community/storage-go"
)

type localStorage struct{}

func NewLocalStorage() core.LocalStorageServices {
	return &localStorage{}
}

// UploadFile implements [core.LocalStorageServices].
func (l *localStorage) UploadFile(typePath string, fileHeader *multipart.FileHeader) (string, error) {
	fileName := fmt.Sprintf("%s_%s", uuid.New().String(), fileHeader.Filename)
	filePath := filepath.Join("public", typePath, fileName)

	src, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dest, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dest.Close()

	if _, err := io.Copy(dest, src); err != nil {
		return "", err
	}

	return fileName, nil
}

// UpdateFile implements [core.LocalStorageServices].
func (l *localStorage) UpdateFile(typePath string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error) {
	fileName := fmt.Sprintf("%s_%s", uuid.New().String(), newFileHeader.Filename)

	oldFilePath := filepath.Join("public", typePath, oldFileName)
	filePath := filepath.Join("public", typePath, fileName)

	_ = os.Remove(oldFilePath)

	src, err := newFileHeader.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	dest, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dest.Close()

	if _, err := io.Copy(dest, src); err != nil {
		return "", err
	}

	return fileName, nil
}

// RemoveFile implements [core.LocalStorageServices].
func (l *localStorage) RemoveFile(typePath string, fileName string) error {
	oldFilePath := filepath.Join("public", typePath, fileName)
	_ = os.Remove(oldFilePath)

	return nil
}

type supabaseStorage struct {
	storageClient *storage_go.Client
}


func NewSupabaseStorage() core.SupabaseStorageService {
	secretKey := os.Getenv("SUPABASE_SECRET_KEY")
	client := storage_go.NewClient("https://csynydrezoocsnffsejc.storage.supabase.co/storage/v1/s3", secretKey, nil)

	return &supabaseStorage{
		storageClient: client,
	}
}

// UploadFile implements [core.SupabaseStorageService].
func (s *supabaseStorage) UploadFile(bucketName string, fileHeader *multipart.FileHeader) (string, error) {
	fileName := fmt.Sprintf("%s_%s", uuid.New().String(), fileHeader.Filename)

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := s.storageClient.UploadFile(bucketName, fileName, file); err != nil {
		return "", err
	}

	return fileName, nil
}

// UpdateFile implements [core.SupabaseStorageService].
func (s *supabaseStorage) UpdateFile(bucketName string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error) {
	existsFiles, err := s.storageClient.ListFiles(bucketName, "", storage_go.FileSearchOptions{})
	if err != nil {
		return "", err
	}

	for _, file := range existsFiles {
		if file.Name == oldFileName {
			if _, err := s.storageClient.RemoveFile(bucketName, []string{file.Name}); err != nil {
				return "", err
			}
		}
	}

	fileName := fmt.Sprintf("%s_%s", uuid.New().String(), newFileHeader.Filename)

	file, err := newFileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := s.storageClient.UploadFile(bucketName, fileName, file); err != nil {
		return "", err
	}

	return fileName, nil
}

// RemoveFile implements [core.SupabaseStorageService].
func (s *supabaseStorage) RemoveFile(bucketName string, fileName string) error {
	if _, err := s.storageClient.RemoveFile(bucketName, []string{fileName}); err != nil {
		return err
	}

	return nil
}
