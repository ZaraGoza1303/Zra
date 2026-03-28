package dto

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type PaginatedResponse[T any, C any] struct {
	Message    string `json:"message"`
	Data       []T    `json:"data"`
	NextCursor *C     `json:"next_cursor"`
}

func SendErrorResponse(message string) Response {
	return Response{
		Success: false,
		Message: message,
		Data:    nil,
	}
}

func SendErrorResponseWithData(message string, data interface{}) Response {
	return Response{
		Success: false,
		Message: message,
		Data:    data,
	}
}

func SendSuccessfulResponse(message string, data interface{}) Response {
	return Response{
		Success: true,
		Message: message,
		Data:    data,
	}
}
