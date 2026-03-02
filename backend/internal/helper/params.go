package helper

import (
	"fmt"
	"strconv"
)

func GetParams(strId string) (uint, error) {
	id, err := strconv.Atoi(strId)
	if err != nil {
		return 0, fmt.Errorf("Gagal konversi params: %w", err)
	}

	return uint(id), nil
}
