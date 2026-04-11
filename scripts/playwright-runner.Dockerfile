FROM mcr.microsoft.com/playwright:v1.59.0-focal

# Working directory
WORKDIR /workspace

# Copy repository into the image (build context should be repo root)
COPY . /workspace

# Use pnpm (installed via npm in the base image if not present)
RUN npm install -g pnpm@9.15.0 || true

# Install dependencies
RUN pnpm install --frozen-lockfile --silent

# Install Playwright browsers (with deps inside the container)
RUN pnpm exec playwright install --with-deps

# Default command: run Playwright tests (chromium project)
CMD ["pnpm","exec","playwright","test","--project=chromium","--reporter=list"]
