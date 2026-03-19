package helper

import (
	"testing"
)

func TestNormalizeImagePath(t *testing.T) {
	tests := []struct {
		name        string
		path        string
		backendUrl  string
		storagePath string
		expected    string
	}{
		{
			name:        "Local path should be prepended",
			path:        "abc123_avatar.png",
			backendUrl:  "https://api.example.com",
			storagePath: "/public/users/",
			expected:    "https://api.example.com/public/users/abc123_avatar.png",
		},
		{
			name:        "Full HTTPS URL should remain unchanged",
			path:        "https://csynydrezoocsnffsejc.supabase.co/storage/v1/object/public/rooms/image.png",
			backendUrl:  "https://api.example.com",
			storagePath: "/public/rooms/",
			expected:    "https://csynydrezoocsnffsejc.supabase.co/storage/v1/object/public/rooms/image.png",
		},
		{
			name:        "Full HTTP URL should remain unchanged",
			path:        "http://example.com/image.png",
			backendUrl:  "https://api.example.com",
			storagePath: "/public/users/",
			expected:    "http://example.com/image.png",
		},
		{
			name:        "Empty path should return empty",
			path:        "",
			backendUrl:  "https://api.example.com",
			storagePath: "/public/users/",
			expected:    "",
		},
		{
			name:        "Empty path should return empty",
			path:        "abc123_avatar.png",
			backendUrl:  "https://api.example.com",
			storagePath: "/public/users/",
			expected:    "https://api.example.com/public/users/abc123_avatar.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeImagePath(tt.path, tt.backendUrl, tt.storagePath)
			if result != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, result)
			}
		})
	}
}
