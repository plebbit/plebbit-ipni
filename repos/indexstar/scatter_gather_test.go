package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"testing"
	"time"

	"github.com/mercari/go-circuitbreaker"
	"github.com/stretchr/testify/require"
)

var _ (Backend) = (*testBackend)(nil)

type testBackend int

func (t testBackend) URL() *url.URL {
	u, err := url.Parse("http://test.invalid")
	if err != nil {
		panic(err)
	}
	return u
}

func (t testBackend) CB() *circuitbreaker.CircuitBreaker { return nil }

func (t testBackend) Matches(*http.Request) bool { return false }

func TestScatterGather_GathersExpectedResults(t *testing.T) {
	subject := scatterGather[testBackend, string]{
		backends: []testBackend{testBackend(1), testBackend(2), testBackend(3), testBackend(4), testBackend(5)},
		maxWait:  2 * time.Second,
	}

	ctx := context.Background()
	err := subject.scatter(ctx, func(cctx context.Context, i testBackend) (*string, error) {
		if cctx.Err() == nil {
			str := fmt.Sprintf("%d fish", i)
			return &str, nil
		}
		return nil, cctx.Err()
	})
	require.NoError(t, err)

	var gotResults []string
	for got := range subject.gather(ctx) {
		gotResults = append(gotResults, got)
	}
	require.Len(t, gotResults, 5)
	require.Contains(t, gotResults, "1 fish")
	require.Contains(t, gotResults, "2 fish")
	require.Contains(t, gotResults, "3 fish")
	require.Contains(t, gotResults, "4 fish")
	require.Contains(t, gotResults, "5 fish")
}

func TestScatterGather_ExcludesScatterErrors(t *testing.T) {
	subject := scatterGather[testBackend, string]{
		backends: []testBackend{testBackend(1), testBackend(2), testBackend(3)},
		maxWait:  2 * time.Second,
	}
	ctx := context.Background()
	err := subject.scatter(ctx, func(cctx context.Context, i testBackend) (*string, error) {
		if i == 2 {
			return nil, errors.New("fish says no")
		}
		if cctx.Err() == nil {
			str := fmt.Sprintf("%d fish", i)
			return &str, nil
		}
		return nil, cctx.Err()
	})
	require.NoError(t, err)

	var gotResults []string
	for got := range subject.gather(ctx) {
		gotResults = append(gotResults, got)
	}
	require.Len(t, gotResults, 2)
	require.Contains(t, gotResults, "1 fish")
	require.Contains(t, gotResults, "3 fish")
	require.NotContains(t, gotResults, "2 fish")
}

func TestScatterGather_DoesNotWaitLongerThanExpected(t *testing.T) {
	subject := scatterGather[testBackend, string]{
		backends: []testBackend{testBackend(1)},
		maxWait:  100 * time.Millisecond,
	}
	ctx := context.Background()
	err := subject.scatter(ctx, func(cctx context.Context, i testBackend) (*string, error) {
		time.Sleep(2 * time.Second)
		if cctx.Err() == nil {
			str := fmt.Sprintf("%d fish", i)
			return &str, nil
		}
		return nil, cctx.Err()
	})
	require.NoError(t, err)

	var gotResults []string
	for got := range subject.gather(ctx) {
		gotResults = append(gotResults, got)
	}
	require.Len(t, gotResults, 0)
}

func TestScatterGather_GathersNothingWhenContextIsCancelled(t *testing.T) {
	subject := scatterGather[testBackend, string]{
		backends: []testBackend{testBackend(1), testBackend(2), testBackend(3)},
		maxWait:  2 * time.Second,
	}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	cancel()

	err := subject.scatter(ctx, func(cctx context.Context, i testBackend) (*string, error) {
		if cctx.Err() == nil {
			str := fmt.Sprintf("%d fish", i)
			return &str, nil
		}
		return nil, cctx.Err()
	})
	require.NoError(t, err)

	var gotResults []string
	for got := range subject.gather(ctx) {
		gotResults = append(gotResults, got)
	}
	require.Len(t, gotResults, 0)
}
