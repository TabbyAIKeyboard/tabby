module.exports = {
  ".env*": () => [
    'echo "Error: Environment variable files (.env*) cannot be committed."',
    "exit 1",
  ],
  "{frontend,nextjs-backend}/**/*.{js,jsx,ts,tsx}": () => [
    "pnpm run build:staged",
  ],
  "frontend/**/*.{js,jsx,ts,tsx}": [
    "pnpm --dir frontend run next:lint",
    "pnpm --dir frontend run format",
  ],
  "nextjs-backend/**/*.{js,jsx,ts,tsx}": [
    "pnpm --dir nextjs-backend run format",
  ],
};
