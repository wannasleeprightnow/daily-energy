package models

type Plan struct {
	Id                string
	UserID             int64
	Date              int64
	CaloriesToConsume int
	CaloriesToBurn    int
	Recommendation    string
	Type              ActionType
	ProfileHash       string
}
