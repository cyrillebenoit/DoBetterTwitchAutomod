import {MongoClient} from "mongodb";
import {terms} from './default-block-list';
require('./interfaces/User');
require('./interfaces/Report');

// Login to MongoDB
const mongoClient = new MongoClient(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/${process.env.MONGO_DB}?retryWrites=true&w=majority&authSource=${process.env.MONGO_AUTH}`);

const connector = module.exports = {
    createUser(id: string, name: string): User {
        return {
            userId: id,
            username: name,
            mode: 'delete',
            blockedTerms: terms,
            watching: false,
            trailing: false,
            "1337": true,
            spaces: true
        }
    },
    async ensureUserExists(userId: string, username: string): Promise<any> {
        const pointer = await mongoClient
            .db('tdba')
            .collection('users')
            .find({
                userId: {$eq: userId}
            })
            .project({"_id": 0}).toArray();
        if (pointer.length === 0) {
            let user = connector.createUser(userId, username);
            connector.updateUser(user);
            return user;
        } else {
            return pointer[0];
        }
    },
    getUsers(): Promise<any[]> {
        return mongoClient.db('tdba')
            .collection('users')
            .find({})
            .toArray();
    },
    updateUser(user: User): void {
        mongoClient.db('tdba')
            .collection('users')
            .updateOne({userId: {$eq: user.userId}},
                {$set: user},
                {upsert: true}
            ).catch(console.error);
    },
    createReport(report: Report): void {
        mongoClient.db('tdba')
            .collection('reports')
            .insertOne(report)
            .catch(console.error);
    },
    connect(): Promise<MongoClient> {
        return mongoClient.connect();
    }
}
