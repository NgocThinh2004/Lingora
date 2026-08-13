pipeline {
    agent any

    environment {
        // File .env chứa mật khẩu được giữ an toàn ở thư mục cũ
        ENV_FILE = '/var/lib/jenkins/.env'
    }

    stages {
        stage('Prepare') {
            steps {
                echo '>>> [1/3] Chuẩn bị môi trường...'
                // Copy file .env vào workspace của Jenkins để docker compose đọc được
                sh "cp ${ENV_FILE} ${WORKSPACE}/.env"
            }
        }

        stage('Build & Deploy Docker') {
            steps {
                echo '>>> [2/3] Tắt hệ thống cũ và build lại image mới...'
                // Dùng thẳng WORKSPACE (Jenkins tự clone code vào đây rồi)
                sh """
                    cd ${WORKSPACE}
                    docker compose --project-name lingora build
                    docker compose --project-name lingora up -d
                """
            }
        }

        stage('Verify') {
            steps {
                echo '>>> [3/3] Kiểm tra hệ thống đã sống chưa...'
                sh 'sleep 30'
                sh "docker compose --project-name lingora -f ${WORKSPACE}/docker-compose.yml ps"
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
