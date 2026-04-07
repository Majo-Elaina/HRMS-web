<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const loginForm = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const formRef = ref(null)
const currentBgIndex = ref(0)
const nextBgIndex = ref(1)
const isTransitioning = ref(false)

// 背景图片列表（排除竖屏的01）
const backgroundImages = [
  new URL('../assets/images/亚托莉00.jpg', import.meta.url).href,
  new URL('../assets/images/亚托莉02.jpg', import.meta.url).href,
  new URL('../assets/images/亚托莉03.jpg', import.meta.url).href,
  new URL('../assets/images/亚托莉04.jpg', import.meta.url).href
]

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 背景图片轮播 - 更丝滑的过渡效果
const rotateBackground = () => {
  setInterval(() => {
    isTransitioning.value = true
    
    // 预加载下一张图片
    nextBgIndex.value = (currentBgIndex.value + 1) % backgroundImages.length
    
    // 延迟切换，确保过渡效果
    setTimeout(() => {
      currentBgIndex.value = nextBgIndex.value
      isTransitioning.value = false
    }, 100)
  }, 6000) // 每6秒切换一次，给过渡更多时间
}

const handleLogin = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  const result = await userStore.login(loginForm.username, loginForm.password)
  loading.value = false

  if (result.success) {
    ElMessage.success('欢迎回来！亚托莉为您服务')
    router.push('/dashboard')
  } else {
    ElMessage.error(result.message)
  }
}

onMounted(() => {
  rotateBackground()
})
</script>

<template>
  <div class="login-container">
    <!-- 背景图片层 -->
    <div 
      class="background-layer current-bg" 
      :style="{ backgroundImage: `url(${backgroundImages[currentBgIndex]})` }"
      :class="{ 'transitioning': isTransitioning }"
    ></div>
    <div 
      class="background-layer next-bg" 
      :style="{ backgroundImage: `url(${backgroundImages[nextBgIndex]})` }"
      :class="{ 'transitioning': isTransitioning }"
    ></div>
    
    <!-- 背景遮罩 -->
    <div class="background-overlay"></div>
    
    <!-- 左侧装饰区域 -->
    <div class="left-decoration">
      <div class="atri-branding">
        <div class="atri-logo-text">
          <span class="atri-main">ATRI</span>
          <div class="atri-glow"></div>
        </div>
        <h1 class="system-title">智能人事管理系统</h1>
        <p class="system-subtitle">Artificial Intelligence Human Resources Management System</p>
        <div class="feature-list">
          <div class="feature-item">
            <el-icon><ChatDotRound /></el-icon>
            <span>AI智能助手</span>
          </div>
          <div class="feature-item">
            <el-icon><User /></el-icon>
            <span>员工管理</span>
          </div>
          <div class="feature-item">
            <el-icon><Calendar /></el-icon>
            <span>考勤管理</span>
          </div>
          <div class="feature-item">
            <el-icon><Money /></el-icon>
            <span>薪资管理</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="login-box">
      <div class="login-header">
        <div class="header-atri-logo">
          <span class="header-atri-text">ATRI</span>
          <div class="header-atri-subtitle">HRMS</div>
        </div>
        <h2>欢迎使用 ATRI 智能人事系统</h2>
        <p class="welcome-text">让亚托莉为您提供智能化的人事管理服务</p>
      </div>
      
      <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
            class="login-input"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            class="login-input"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            {{ loading ? '亚托莉正在验证中...' : '登录系统' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-tips">
        <div class="tips-header">
          <el-icon><InfoFilled /></el-icon>
          <span>测试账号</span>
        </div>
        <div class="account-grid">
          <div class="account-item">
            <strong>总经理</strong>
            <span>gm / 123456</span>
          </div>
          <div class="account-item">
            <strong>HR专员</strong>
            <span>hr_lina / 123456</span>
          </div>
          <div class="account-item">
            <strong>HR经理</strong>
            <span>hr_manager / 123456</span>
          </div>
          <div class="account-item">
            <strong>部门经理</strong>
            <span>manager_zhao / 123456</span>
          </div>
          <div class="account-item">
            <strong>财务经理</strong>
            <span>finance_liu / 123456</span>
          </div>
          <div class="account-item">
            <strong>财务专员</strong>
            <span>finance_chen / 123456</span>
          </div>
          <div class="account-item">
            <strong>普通员工</strong>
            <span>emp_zhou / 123456</span>
          </div>
          <div class="account-item">
            <strong>开发人员</strong>
            <span>yunyue / yunyue</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  padding: 0 5%;
  overflow: hidden;
}

/* 背景图片层 - 实现丝滑过渡 */
.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.current-bg {
  opacity: 1;
}

.current-bg.transitioning {
  opacity: 0;
}

.next-bg {
  opacity: 0;
}

.next-bg.transitioning {
  opacity: 1;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.6) 0%, 
    rgba(118, 75, 162, 0.6) 50%,
    rgba(64, 158, 255, 0.4) 100%);
  backdrop-filter: blur(1px);
}

.left-decoration {
  flex: 1;
  max-width: 500px;
  z-index: 1;
  color: white;
  animation: slideInFromLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.atri-branding {
  text-align: left;
  padding: 40px;
}

.atri-logo-text {
  position: relative;
  display: inline-block;
  margin-bottom: 30px;
}

.atri-main {
  font-size: 72px;
  font-weight: 900;
  font-family: 'Arial Black', 'Helvetica', sans-serif;
  background: linear-gradient(45deg, #ffffff, #e3f2fd, #bbdefb, #90caf9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
  position: relative;
  z-index: 2;
}

.atri-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, #667eea, #764ba2);
  filter: blur(20px);
  opacity: 0.6;
  z-index: 1;
  animation: glow 3s ease-in-out infinite alternate;
}

@keyframes glow {
  from {
    filter: blur(20px);
    opacity: 0.6;
  }
  to {
    filter: blur(25px);
    opacity: 0.8;
  }
}

.system-title {
  font-size: 32px;
  font-weight: bold;
  margin: 0 0 10px 0;
  background: linear-gradient(45deg, #fff, #e3f2fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.system-subtitle {
  font-size: 16px;
  margin: 0 0 40px 0;
  opacity: 0.9;
  font-weight: 300;
  font-style: italic;
}

.feature-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 40px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.feature-item .el-icon {
  font-size: 20px;
  color: #e3f2fd;
}

.feature-item span {
  font-size: 16px;
  font-weight: 500;
}

.login-box {
  width: 450px;
  padding: 40px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.75) 0%,
    rgba(240, 245, 255, 0.7) 30%,
    rgba(235, 240, 255, 0.72) 70%,
    rgba(245, 248, 255, 0.75) 100%);
  border-radius: 20px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 0 20px rgba(102, 126, 234, 0.05);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  z-index: 1;
  position: relative;
  animation: slideInFromRight 0.8s cubic-bezier(0.4, 0, 0.2, 1), 
             floatSubtle 6s ease-in-out infinite 1s;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes floatSubtle {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* 为登录框添加更明显的内部光效和渐变 */
.login-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.08) 0%,
    rgba(118, 75, 162, 0.06) 30%,
    rgba(64, 158, 255, 0.05) 70%,
    rgba(147, 197, 253, 0.08) 100%);
  border-radius: 20px;
  pointer-events: none;
  z-index: -1;
}

.login-box::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, 
    rgba(102, 126, 234, 0.2) 0%,
    rgba(118, 75, 162, 0.15) 50%,
    rgba(64, 158, 255, 0.2) 100%);
  border-radius: 22px;
  filter: blur(8px);
  opacity: 0.3;
  pointer-events: none;
  z-index: -2;
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.header-atri-logo {
  margin-bottom: 20px;
  position: relative;
}

.header-atri-text {
  font-size: 48px;
  font-weight: 900;
  font-family: 'Arial Black', 'Helvetica', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 3px;
  display: block;
  line-height: 1;
}

.header-atri-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #667eea;
  letter-spacing: 2px;
  margin-top: 5px;
}

.login-header h2 {
  margin: 0 0 10px 0;
  color: #1a202c;
  font-size: 24px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.welcome-text {
  color: #4a5568;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.6);
}

.login-form {
  margin-bottom: 25px;
}

.login-input {
  margin-bottom: 8px;
}

.login-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(200, 210, 240, 0.6);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.7) 0%,
    rgba(240, 245, 255, 0.65) 50%,
    rgba(235, 240, 255, 0.7) 100%);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.login-input :deep(.el-input__wrapper:hover) {
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.85) 0%,
    rgba(240, 245, 255, 0.8) 50%,
    rgba(235, 240, 255, 0.85) 100%);
}

.login-input :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(102, 126, 234, 0.7);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(240, 245, 255, 0.85) 50%,
    rgba(235, 240, 255, 0.9) 100%);
}

.login-btn {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.login-tips {
  background: linear-gradient(135deg, 
    rgba(240, 245, 255, 0.7) 0%,
    rgba(235, 240, 255, 0.75) 50%,
    rgba(230, 235, 255, 0.8) 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(200, 210, 240, 0.5);
  backdrop-filter: blur(15px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 0 0 10px rgba(102, 126, 234, 0.03);
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  color: #2d3748;
  font-weight: 600;
  font-size: 14px;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.6);
}

.account-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.account-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.8) 0%,
    rgba(240, 245, 255, 0.75) 50%,
    rgba(235, 240, 255, 0.8) 100%);
  border-radius: 8px;
  border: 1px solid rgba(200, 210, 240, 0.4);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.account-item:hover {
  border-color: rgba(102, 126, 234, 0.4);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
  background: linear-gradient(135deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(240, 245, 255, 0.85) 50%,
    rgba(235, 240, 255, 0.9) 100%);
  transform: translateY(-1px);
}

.account-item strong {
  font-size: 12px;
  color: #1a202c;
  font-weight: 600;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.6);
}

.account-item span {
  font-size: 11px;
  color: #4a5568;
  font-family: 'Courier New', monospace;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.4);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .left-decoration {
    display: none;
  }
  
  .login-container {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .login-container {
    min-height: 100dvh;
    align-items: stretch;
    padding: 16px;
  }
  
  .login-box {
    width: 100%;
    max-width: 400px;
    margin: auto 0;
    padding: 24px 18px;
    border-radius: 18px;
  }
  
  .account-grid {
    grid-template-columns: 1fr;
  }

  .login-header {
    margin-bottom: 24px;
  }

  .header-atri-text {
    font-size: 38px;
  }

  .login-header h2 {
    font-size: 20px;
    line-height: 1.4;
  }

  .welcome-text {
    font-size: 13px;
  }

  .login-tips {
    padding: 14px;
    max-height: 34dvh;
    overflow: auto;
  }

  .account-item {
    padding: 9px 10px;
  }

  .account-item span {
    word-break: break-all;
    line-height: 1.55;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 12px;
  }

  .login-box {
    padding: 20px 14px;
    border-radius: 16px;
  }

  .header-atri-text {
    font-size: 32px;
    letter-spacing: 2px;
  }

  .header-atri-subtitle {
    font-size: 12px;
  }

  .login-header h2 {
    font-size: 18px;
  }

  .login-btn {
    height: 46px;
    font-size: 15px;
  }

  .tips-header {
    margin-bottom: 12px;
  }

  .login-tips {
    max-height: 38dvh;
  }

  .account-item strong {
    font-size: 13px;
  }

  .account-item span {
    font-size: 12px;
  }
}

.login-container,
.login-box,
.login-header,
.login-tips,
.account-item,
.login-form {
  user-select: text;
  caret-color: auto;
}

/* 隐藏表单验证错误提示 */
.login-form :deep(.el-form-item__error) {
  display: none;
}

/* 验证失败时的输入框样式优化 */
.login-form :deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: rgba(245, 108, 108, 0.5) !important;
  box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.1) !important;
}
</style>
