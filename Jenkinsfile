pipeline {
    agent any

    environment {
        // Đường dẫn thư mục chứa code trên VPS
        APP_DIR = '/home/hung/Lingora'
    }

    stages {
        stage('Pull Code') {
            steps {
                echo '>>> [1/3] Kéo code mới nhất từ Github về...'
                sh """
                    cd ${APP_DIR}
                    git fetch
                    git checkout develop
                    git pull origin develop
                """
            }
        }

        stage('Build & Deploy Docker') {
            steps {
                echo '>>> [2/3] Tắt hệ thống cũ và build lại image mới...'
                sh """
                    cd ${APP_DIR}
                    docker compose down
                    docker compose up --build -d
                """
            }
        }

        stage('Verify') {
            steps {
                echo '>>> [3/3] Kiểm tra hệ thống đã sống chưa...'
                // Chờ 30 giây để hệ thống khởi động xong rồi mới kiểm tra
                sh 'sleep 30'
                sh 'docker compose -f ${APP_DIR}/docker-compose.yml ps'
                echo '>>> DEPLOY THÀNH CÔNG! Web đã được cập nhật.'
            }
        }
    }

    post {
        success {
            echo '>>> BUILD VÀ DEPLOY THÀNH CÔNG!'
        }
        failure {
            echo '>>> BUILD THẤT BẠI! Kiểm tra log bên trên để tìm lỗi.'
        }
    }
}
