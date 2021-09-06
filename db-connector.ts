import {MongoClient} from "mongodb";
import {blacklist} from './default-list';
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
            blockedTerms: blacklist,
            watching: false,
            preferences:{
                include: false,
                leet: true,
                repeat: true,
                spaces: true
            }
        }
    },
    async ensureUserExists(userId: string, username: string): Promise<User> {
        const pointer = await mongoClient
            .db(process.env.MONGO_DB)
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
            let user = pointer[0];
            return {
                userId: user.userId,
                username: user.username,
                mode: user.mode,
                blockedTerms: user.blockedTerms,
                watching: user.watching,
                preferences: user.preferences,
            };
        }
    },
    getUsers(): Promise<any[]> {
        return mongoClient.db(process.env.MONGO_DB)
            .collection('users')
            .find({})
            .toArray();
    },
    updateUser(user: User): void {
        mongoClient.db(process.env.MONGO_DB)
            .collection('users')
            .updateOne({userId: {$eq: user.userId}},
                {$set: user},
                {upsert: true}
            ).catch(console.error);
    },
    createReport(report: Report): void {
        mongoClient.db(process.env.MONGO_DB)
            .collection('reports')
            .insertOne(report)
            .catch(console.error);
    },
    connect(): Promise<MongoClient> {
        return mongoClient.connect();
    }
}

export default connector;

