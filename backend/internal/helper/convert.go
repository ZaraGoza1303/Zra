package helper

import (
	"fmt"
	"strconv"
)

func StringToUint(str string) uint {
	u64, err := strconv.ParseUint(str, 10, 0)
	if err != nil {
		fmt.Println("Error konversi:", err)
		return 0
	}

	return uint(u64)
}
