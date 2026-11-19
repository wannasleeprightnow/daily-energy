package handler

import "testing"

func TestCredentialValidation(t *testing.T) {
	tests := []struct {
		name  string
		input credentials
		want  bool
	}{
		{"valid", credentials{Username: "daily.user_1", Password: "long-password"}, true},
		{"short username", credentials{Username: "ab", Password: "long-password"}, false},
		{"invalid username characters", credentials{Username: "name with spaces", Password: "long-password"}, false},
		{"short password", credentials{Username: "dailyuser", Password: "short"}, false},
		{"over bcrypt limit", credentials{Username: "dailyuser", Password: string(make([]byte, 73))}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validCredentials(tt.input); got != tt.want {
				t.Fatalf("validCredentials()=%v, want %v", got, tt.want)
			}
		})
	}
}

func TestRandomTokensAreUniqueAndStoredAsHashes(t *testing.T) {
	a, err := randomToken()
	if err != nil {
		t.Fatal(err)
	}
	b, err := randomToken()
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Fatal("random tokens unexpectedly matched")
	}
	hash := tokenHash(a)
	if hash == a || len(hash) != 64 || hash != tokenHash(a) {
		t.Fatal("token hash is not stable or does not transform token")
	}
}
