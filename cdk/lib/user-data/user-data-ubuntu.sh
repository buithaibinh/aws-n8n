#!/bin/bash
# Dừng tập lệnh nếu có lệnh nào bị lỗi
set -e

# Ghi log để kiểm tra script có bắt đầu chạy không
echo "User data script started" >> /tmp/user-data.log

# Update hệ thống
echo "Updating system..." >> /tmp/user-data.log
apt-get update -y

# Cài đặt AWS CLI
echo "Installing AWS CLI..." >> /tmp/user-data.log
apt-get install -y unzip curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Kiểm tra AWS CLI đã cài đặt
aws --version >> /tmp/user-data.log

# Thêm NodeSource repository và cài đặt Node.js phiên bản 18
echo "Installing Node.js..." >> /tmp/user-data.log
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Xác nhận Node.js cài đặt thành công
node -v >> /tmp/user-data.log
npm -v >> /tmp/user-data.log

# Cài đặt Yarn
echo "Installing Yarn..." >> /tmp/user-data.log
npm install -g yarn

# Xác nhận Yarn cài đặt thành công
yarn -v >> /tmp/user-data.log

# Cài đặt Docker nếu chưa có
if ! command -v docker &> /dev/null
then
    echo "Installing Docker..." >> /tmp/user-data.log
    apt-get install -y docker.io
    systemctl start docker
    systemctl enable docker
else
    echo "Docker already installed." >> /tmp/user-data.log
fi

# Thêm người dùng ubuntu vào nhóm Docker
usermod -aG docker ubuntu

# Cài đặt Docker Compose
echo "Installing Docker Compose..." >> /tmp/user-data.log
curl -L "https://github.com/docker/compose/releases/download/v2.22.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Xác nhận Docker Compose cài đặt thành công
docker-compose --version >> /tmp/user-data.log

# Tạo SSH key và lưu trữ vào thư mục .ssh
# File ssh public key sẽ được dung để add vào bitbucket hoặc github
# Chỉ tao key khi chưa tồn tại key
if [ -f /home/ubuntu/.ssh/id_rsa ]; then
    echo "SSH key already exists." >> /tmp/user-data.log
else

    echo "Generating SSH key..." >> /tmp/user-data.log
    mkdir -p /home/ubuntu/.ssh
    ssh-keygen -t rsa -b 2048 -f /home/ubuntu/.ssh/id_rsa -q -N ""

    # Hiển thị SSH public key
    echo "SSH public key generated:" >> /tmp/user-data.log
    cat /home/ubuntu/.ssh/id_rsa.pub >> /tmp/user-data.log

    # Thay đổi quyền cho thư mục .ssh và file khóa
    chown -R ubuntu:ubuntu /home/ubuntu/.ssh
    chmod 700 /home/ubuntu/.ssh
    chmod 600 /home/ubuntu/.ssh/id_rsa
    chmod 644 /home/ubuntu/.ssh/id_rsa.pub
fi

# Ghi log khi script hoàn thành
echo "User data script completed" >> /tmp/user-data.log

# Khởi động lại máy ảo
reboot