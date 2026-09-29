package validator

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

func GetTelegramUserID(initData string, botToken string) (string, error) {
	if initData == "" {
		return "", errors.New("initData is empty")
	}

	params, err := url.ParseQuery(initData)
	if err != nil {
		return "", errors.New("invalid telegram initData")
	}
	if !validateInitData(params, botToken) {
		return "", errors.New("invalid telegram initData signature")
	}

	var user struct{ ID int64 }
	if err := json.Unmarshal([]byte(params.Get("user")), &user); err != nil {
		return "", errors.New("invalid user data")
	}

	return strconv.FormatInt(user.ID, 10), nil
}

func validateInitData(params url.Values, botToken string) bool {
	hash := params.Get("hash")
	if hash == "" || botToken == "" {
		return false
	}

	authDate, err := strconv.ParseInt(params.Get("auth_date"), 10, 64)
	if err != nil {
		return false
	}
	issuedAt := time.Unix(authDate, 0)
	if time.Since(issuedAt) > 24*time.Hour || issuedAt.After(time.Now().Add(time.Minute)) {
		return false
	}

	keys := make([]string, 0, len(params)-1)
	for key := range params {
		if key != "hash" {
			keys = append(keys, key)
		}
	}
	sort.Strings(keys)

	lines := make([]string, 0, len(keys))
	for _, key := range keys {
		lines = append(lines, fmt.Sprintf("%s=%s", key, params.Get(key)))
	}
	dataCheckString := strings.Join(lines, "\n")

	secretMAC := hmac.New(sha256.New, []byte(botToken))
	secretMAC.Write([]byte("WebAppData"))
	dataMAC := hmac.New(sha256.New, secretMAC.Sum(nil))
	dataMAC.Write([]byte(dataCheckString))
	calculatedHash := fmt.Sprintf("%x", dataMAC.Sum(nil))
	return len(hash) == len(calculatedHash) && subtle.ConstantTimeCompare([]byte(hash), []byte(calculatedHash)) == 1
}
