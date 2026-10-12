pipeline {
    agent { label 'docker' }
    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    environment {
        // Let Docker allocate a free host port for the CI smoke check.
        APP_PORT = '0'
    }
    stages {
        stage('Prepare') {
            steps {
                script {
                    env.COMPOSE_PROJECT_NAME = env.BUILD_TAG.toLowerCase().replaceAll('[^a-z0-9-]', '-')
                }
                sh 'docker version && docker compose version && docker compose config --quiet'
            }
        }
        stage('Check and build') {
            steps {
                // Dockerfiles run React lint/build and Node.js API tests before packaging.
                sh 'docker compose build --pull'
            }
        }
        stage('Smoke test') {
            steps {
                sh '''
                    docker compose up -d --wait --wait-timeout 90
                    docker compose exec -T client sh -ec 'wget -qO- http://127.0.0.1/ | grep -q "<div id=\\"root\\">"'
                    docker compose exec -T client sh -ec 'wget -qO- http://127.0.0.1/api/health | grep -q "\\"status\\":\\"ok\\""'
                '''
            }
        }
    }
    post {
        always {
            script {
                if (env.COMPOSE_PROJECT_NAME) {
                    sh returnStatus: true, script: 'docker compose logs --no-color > compose.log 2>&1'
                    archiveArtifacts artifacts: 'compose.log', allowEmptyArchive: true
                    sh returnStatus: true, script: 'docker compose down --remove-orphans --rmi local'
                }
            }
        }
    }
}

