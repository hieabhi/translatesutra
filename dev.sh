#!/bin/bash

# TranslateSutra Docker Compose Development Helper
# This script provides convenient commands for Docker Compose development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Create .env file if it doesn't exist
setup_env() {
    if [ ! -f .env ]; then
        print_info "Creating .env file from .env.example..."
        cp .env.example .env
        print_success ".env file created! Please review and update the configuration."
    else
        print_info ".env file already exists."
    fi
}

# Show usage information
show_usage() {
    echo "TranslateSutra Docker Development Helper"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  setup           Setup development environment (create .env)"
    echo "  up              Start basic services (postgres + backend + web)"
    echo "  full            Start all services including translation & keycloak"
    echo "  translation     Start with LibreTranslate service"
    echo "  keycloak        Start with Keycloak authentication"
    echo "  cache           Start with Redis cache"
    echo "  down            Stop all services"
    echo "  restart         Restart all services"
    echo "  logs            Show logs for all services"
    echo "  logs [service]  Show logs for specific service"
    echo "  ps              Show running containers"
    echo "  clean           Remove all containers and volumes"
    echo "  db-migrate      Run database migrations"
    echo "  db-seed         Seed database with sample data"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Initial setup"
    echo "  $0 up                       # Start basic development stack"
    echo "  $0 full                     # Start full stack with all services"
    echo "  $0 logs backend             # Show backend logs"
    echo "  $0 clean                    # Clean up everything"
}

# Setup development environment
cmd_setup() {
    print_info "Setting up TranslateSutra development environment..."
    check_dependencies
    setup_env
    
    print_info "Building backend image..."
    docker-compose build backend
    
    print_success "Setup complete! You can now run: $0 up"
}

# Start basic services
cmd_up() {
    check_dependencies
    setup_env
    print_info "Starting basic development stack (postgres + backend + web)..."
    docker-compose up -d postgres
    sleep 5  # Wait for postgres to be ready
    docker-compose up -d backend web
    print_success "Development stack is running!"
    print_info "Services available at:"
    print_info "  - Web: http://localhost:8081"
    print_info "  - Backend API: http://localhost:3000"
    print_info "  - PostgreSQL: localhost:5432"
}

# Start full stack
cmd_full() {
    check_dependencies
    setup_env
    print_info "Starting full development stack..."
    docker-compose --profile translation --profile keycloak --profile cache up -d
    print_success "Full development stack is running!"
    print_info "Services available at:"
    print_info "  - Web: http://localhost:8081"
    print_info "  - Backend API: http://localhost:3000"
    print_info "  - PostgreSQL: localhost:5432"
    print_info "  - LibreTranslate: http://localhost:5000"
    print_info "  - Keycloak: http://localhost:8080"
    print_info "  - Redis: localhost:6379"
}

# Start with translation service
cmd_translation() {
    check_dependencies
    setup_env
    print_info "Starting development stack with LibreTranslate..."
    docker-compose --profile translation up -d
    print_success "Development stack with translation is running!"
}

# Start with Keycloak
cmd_keycloak() {
    check_dependencies
    setup_env
    print_info "Starting development stack with Keycloak..."
    docker-compose --profile keycloak up -d
    print_success "Development stack with Keycloak is running!"
}

# Start with Redis cache
cmd_cache() {
    check_dependencies
    setup_env
    print_info "Starting development stack with Redis cache..."
    docker-compose --profile cache up -d
    print_success "Development stack with cache is running!"
}

# Stop all services
cmd_down() {
    print_info "Stopping all services..."
    docker-compose --profile translation --profile keycloak --profile cache down
    print_success "All services stopped."
}

# Restart services
cmd_restart() {
    print_info "Restarting services..."
    cmd_down
    sleep 2
    cmd_up
}

# Show logs
cmd_logs() {
    if [ -z "$2" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$2"
    fi
}

# Show running containers
cmd_ps() {
    docker-compose ps
}

# Clean up everything
cmd_clean() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        docker-compose --profile translation --profile keycloak --profile cache down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup complete!"
    else
        print_info "Cleanup cancelled."
    fi
}

# Run database migrations
cmd_db_migrate() {
    print_info "Running database migrations..."
    docker-compose exec backend npm run migrate
    print_success "Database migrations completed!"
}

# Seed database
cmd_db_seed() {
    print_info "Seeding database with sample data..."
    docker-compose exec backend npm run seed
    print_success "Database seeding completed!"
}

# Main command dispatcher
case "${1:-help}" in
    setup)
        cmd_setup
        ;;
    up)
        cmd_up
        ;;
    full)
        cmd_full
        ;;
    translation)
        cmd_translation
        ;;
    keycloak)
        cmd_keycloak
        ;;
    cache)
        cmd_cache
        ;;
    down)
        cmd_down
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs "$@"
        ;;
    ps)
        cmd_ps
        ;;
    clean)
        cmd_clean
        ;;
    db-migrate)
        cmd_db_migrate
        ;;
    db-seed)
        cmd_db_seed
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac