import * as net from 'net';
import pino from 'pino';
import pretty from 'pino-pretty';

const logger = pino(pretty({
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname",
    levelFirst: true,
    messageFormat: "{levelLabel} {pid} {hostname} {msg}",
}));

class Server {
    private readonly host: string;
    private readonly port: string;
    private readonly threads: Array<Promise<never | number>> = [];
    private readonly clients: Array<net.Socket> = [];


    constructor(host: string, port: string) {
        this.host = host;
        this.port = port;

    }

    public start(): void {
        const server = net.createServer();
        server.listen(
            parseInt(this.port));
        server.on("connection", (socket) => this.handleConnection(socket));
        server.on("error", (error) => this.handleError(error));
        logger.info(`Server started on port ${this.port}`);
    }

    private handleConnection(socket: net.Socket): void {
        logger.info(`New client connected: ${socket.remoteAddress}:${socket.remotePort}`);
        this.clients.push(socket);
        const thread = this.handleThread(socket);
        this.threads.push(thread);

    }

    private async handleThread(socket: net.Socket): Promise<never | number> {
        let clientName: string;
        return new Promise((resolve, reject) => {
            socket.on("data", (data) => {
                logger.info(`Received data from client: ${data.toString()}`);
                const stringData = data.toString().trim().replace(/(\r\n|\n|\r)/gm, "");

                if (!clientName) {
                    clientName = stringData;
                    // send message to client asking for its name
                    socket.write("Welcome to the server, please enter your name:");
                    socket.write("\n");
                    logger.info(`Client name is ${stringData}, sending welcome message`);
                    this.broadcast(`${clientName} has joined the chat`);
                    return;
                }
                logger.info(`Broadcasting message from ${stringData}`);
                this.broadcast(`${clientName}: ${stringData}`);
            });

            socket.on("close", () => {
                logger.warn("Client disconnected");
                resolve(0);
            });

            socket.on("error", (err) => {
                logger.error(`Socket error: ${err}`);
                reject(err);
            });
        });
    }

    private broadcast(message: string): void {
        this.clients.forEach((client) => {
            client.write(`${message}`);
            client.write("\n");
        });
    }

    private handleError(error: Error): void {
        logger.error(`Server error: ${error}`);
    }
}

const port = process.env.PORT || "8080";
const host = process.env.HOST || "localhost";

const server = new Server(host, port);
// print server prototype
console.log(server);
server.start();