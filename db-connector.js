"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongodb_1 = require("mongodb");
var default_list_1 = require("./default-list");
require('./interfaces/User');
require('./interfaces/Report');
// Login to MongoDB
var mongoClient = new mongodb_1.MongoClient("mongodb://" + process.env.MONGO_USER + ":" + process.env.MONGO_PASS + "@localhost/" + process.env.MONGO_DB + "?retryWrites=true&w=majority&authSource=" + process.env.MONGO_AUTH);
var connector = module.exports = {
    createUser: function (id, name) {
        return {
            userId: id,
            username: name,
            mode: 'delete',
            blockedTerms: default_list_1.blacklist,
            watching: false,
            preferences: {
                include: false,
                leet: true,
                repeat: true,
                spaces: true
            }
        };
    },
    ensureUserExists: function (userId, username) {
        return __awaiter(this, void 0, void 0, function () {
            var pointer, user, user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, mongoClient
                            .db(process.env.MONGO_DB)
                            .collection('users')
                            .find({
                            userId: { $eq: userId }
                        })
                            .project({ "_id": 0 }).toArray()];
                    case 1:
                        pointer = _a.sent();
                        if (pointer.length === 0) {
                            user = connector.createUser(userId, username);
                            connector.updateUser(user);
                            return [2 /*return*/, user];
                        }
                        else {
                            user = pointer[0];
                            return [2 /*return*/, {
                                    userId: user.userId,
                                    username: user.username,
                                    mode: user.mode,
                                    blockedTerms: user.blockedTerms,
                                    watching: user.watching,
                                    preferences: user.preferences,
                                }];
                        }
                        return [2 /*return*/];
                }
            });
        });
    },
    getUsers: function () {
        return mongoClient.db(process.env.MONGO_DB)
            .collection('users')
            .find({})
            .toArray();
    },
    updateUser: function (user) {
        mongoClient.db(process.env.MONGO_DB)
            .collection('users')
            .updateOne({ userId: { $eq: user.userId } }, { $set: user }, { upsert: true }).catch(console.error);
    },
    createReport: function (report) {
        mongoClient.db(process.env.MONGO_DB)
            .collection('reports')
            .insertOne(report)
            .catch(console.error);
    },
    connect: function () {
        return mongoClient.connect();
    }
};
exports.default = connector;
//# sourceMappingURL=db-connector.js.map