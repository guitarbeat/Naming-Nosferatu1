#!/bin/bash
pnpm run dev:server > server.log 2>&1 &
SERVER_PID=$!
sleep 5

echo "Sending requests..."
for i in {1..105}; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/names)
  echo "Request $i: $HTTP_STATUS"
done

kill $SERVER_PID
