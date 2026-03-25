package models

type Platform string

const (
	Youtube   Platform = "youtube"
	Instagram Platform = "instagram"
	Github    Platform = "github"
	Reddit    Platform = "reddit"
)

type SocialLink struct {
	ID     uint `gorm:"primaryKey"`
	UserID uint `gorm:"not null;uniqueIndex"`

	Links []Link `gorm:"foreignKey:SocialLinkID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	User  User   `gorm:"foreignKey:UserID"`
}

type Link struct {
	ID           uint `gorm:"primaryKey"`
	SocialLinkID uint
	Type         *Platform `gorm:"size:20"`
	Url          string    `gorm:"size:255"`
}
