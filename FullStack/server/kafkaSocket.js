import { Kafka } from 'kafkajs';
import { spawn } from 'child_process';
import path from 'path';

export default function setupKafkaAndSockets(io) {
    // 1. Setup Socket.io
    io.on('connection', (socket) => {
        console.log('⚡ Client connected to real-time stream:', socket.id);
        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });

    // 2. Setup Kafka Consumer
    const kafka = new Kafka({
        clientId: 'vector-frontend',
        brokers: ['localhost:9092'],
    });

    const consumer = kafka.consumer({ groupId: 'frontend-group' });

    const runConsumer = async () => {
        try {
            await consumer.connect();
            console.log('✅ Connected to Kafka for stream digestion.');
            
            // Listen to finalized physics transactions
            await consumer.subscribe({ topic: 'transactions.final', fromBeginning: false });
            
            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    if (message.value) {
                        try {
                            const data = JSON.parse(message.value.toString());
                            // Emit straight to any frontend React components listening!
                            io.emit('transactionScored', data);
                        } catch (e) {
                            console.error('Failed to parse kafka message', e);
                        }
                    }
                },
            });
        } catch (err) {
            console.error('❌ Kafka connection failed (Is Docker Kafka running?)', err.message);
        }
    };

    runConsumer();
}
