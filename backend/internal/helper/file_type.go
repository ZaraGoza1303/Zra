package helper

import (
	"mime/multipart"

	"github.com/h2non/filetype"
	"github.com/h2non/filetype/types"
)

func CheckFileType(file *multipart.FileHeader) (types.Type, error) {
	src, err := file.Open()
	if err != nil {
		return types.Unknown, err
	}
	defer src.Close()

	buffer := make([]byte, 261)
	src.Read(buffer)

	return filetype.Match(buffer)
}
