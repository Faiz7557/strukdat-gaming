FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5174 QUIZ_DATA_FILE=/data/rooms.json
COPY . .
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 5174
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5174)+'/api/quiz/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "serve.js"]
