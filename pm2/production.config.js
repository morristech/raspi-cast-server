module.exports = {
  apps: [
    {
      name: 'Cast server',
      script: path.join(process.cwd(), 'build/main.js'),
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/home/pi/cast',
      'post-deploy' : 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
