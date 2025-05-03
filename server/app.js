const express = require('express');
const path = require('path');
const gameRoutes = require('./routes/game');

const app = express();
const port = process.env.PORT || 3000; // 设置端口

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));

// 设置模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 路由
app.use('/', gameRoutes);

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
