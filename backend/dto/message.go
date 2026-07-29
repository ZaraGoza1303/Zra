package dto

// Request/response DTOs untuk operasi message — ini tetap di sini
// Message struct domain sudah pindah ke package hub

type MultipleMsgDeleteReq struct {
	MessageIDs []string `json:"message_ids"`
}

type MessageUpdateRequest struct {
	Content string `form:"content" json:"content" validate:"required"`
	Caption string `form:"caption" json:"caption,omitempty"`
}
