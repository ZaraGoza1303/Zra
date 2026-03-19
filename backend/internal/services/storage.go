package services

import (
	"chatapp/core"
	"fmt"
	"mime/multipart"
	"os"
	"strings"

	"github.com/google/uuid"
	storage_go "github.com/supabase-community/storage-go"
)

type supabaseStorage struct {
	storageClient *storage_go.Client
}


func NewSupabaseStorage() core.StorageService {
	secretKey := os.Getenv("SUPABASE_SECRET_KEY")
	supabaseUrl := os.Getenv("SUPABASE_URL")

	fmt.Printf("DEBUG Supabase URL: '%s'\n", supabaseUrl)

	client := storage_go.NewClient(supabaseUrl+"/storage/v1", secretKey, nil)
	return &supabaseStorage{
		storageClient: client,
	}
}

// GetStorageClient implements [core.StorageService].
func (s *supabaseStorage) GetStorageClient() *storage_go.Client {
	return s.storageClient
}

// UploadFile implements [core.StorageService].
func (s *supabaseStorage) UploadFile(typePath string, fileHeader *multipart.FileHeader) (string, error) {
	fileName := fmt.Sprintf("%s_%s", uuid.New().String(), fileHeader.Filename)

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	if res, err := s.storageClient.UploadFile(typePath, fileName, file); err != nil {
		fmt.Printf("DEBUG: Supabase response: %+v, err: %v\n", res, err)
		return "", err
	}

	return fileName, nil
}

// UpdateFile implements [core.StorageService].
func (s *supabaseStorage) UpdateFile(typePath string, oldFileName string, newFileHeader *multipart.FileHeader) (string, error) {
	existsFiles, err := s.storageClient.ListFiles(typePath, "", storage_go.FileSearchOptions{})
	if err != nil {
		return "", err
	}

	for _, file := range existsFiles {
		if file.Name == oldFileName {
			if _, err := s.storageClient.RemoveFile(typePath, []string{file.Name}); err != nil {
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

	if _, err := s.storageClient.UploadFile(typePath, fileName, file); err != nil {
		return "", err
	}

	return fileName, nil
}

// RemoveFile implements [core.StorageService].
func (s *supabaseStorage) RemoveFile(typePath string, fileName string) error {
	if strings.HasPrefix(fileName, "http") {
		parts := strings.Split(fileName, "/")
		if len(parts) > 0 {
			fileName = strings.Split(parts[len(parts)-1], "?")[0]
		}
	}

	if _, err := s.storageClient.RemoveFile(typePath, []string{fileName}); err != nil {
		return err
	}

	return nil
}
