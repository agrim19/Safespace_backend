const {default: mongoose} = require("mongoose");
const Document = require("../models/documentModel");
const User = require("../models/userModel");
const SharedKey = require("../models/sharedKey");

const ErrorHandler = require("../utils/errorHandler");

exports.createDocument = async (req, res, next) => {
    try {
        const curUser = req.user;
        const {content, title} = req.body;

        const documentBody = {
            content,
            title,
            ownerId: curUser._id,
            lastEditedAt: new Date().toString(),
        };

        const document = await Document.create(documentBody);

        return res.status(200).json(document);
    } catch (e) {
        console.log(e);
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.saveDocument = async (req, res, next) => {
    try {
        const curUser = req.user;
        const {content, docId} = req.body;

        const document = await Document.findOne({
            _id: docId,
            $or: [
                {ownerId: curUser._id},
                {collaborators: {$elemMatch: {id: curUser._id}}},
            ],
        });
        if (!document) {
            return res.status(304).json({err: "Document not found"});
        }
        if (curUser._id in document.collaborators) {
            if (document.collaborators[curUser._id].role === "viewer") {
                return res.status(304).json({
                    err: "You don't have permission to edit this document",
                });
            }
        }
        document.content = content;
        document.lastEditedAt = new Date().toString();
        await document.save();
        return res.status(200).json({success: true});
    } catch (e) {
        console.log(e);
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.getDocuments = async (req, res, next) => {
    try {
        const curUser = req.user;
        const documents = await Document.find({
            $or: [
                {ownerId: curUser._id},
                {collaborators: {$elemMatch: {id: curUser._id}}},
            ],
        });

        const addedInfoDocs = documents.map((item) => {
            const id = item._id;
            let isFav = false;
            if (curUser.favourites.includes(id)) {
                isFav = true;
            }
            return {...item._doc, isFav};
        });

        return res.status(200).json(addedInfoDocs);
    } catch (e) {
        console.log(e);
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.getSingleDocument = async (req, res, next) => {
    try {
        const curUser = req.user;
        const {docId} = req.query;
        const document = await Document.findOne({
            $or: [
                {ownerId: curUser._id},
                {collaborators: {$elemMatch: {id: curUser._id}}},
            ],
            _id: new mongoose.Types.ObjectId(docId),
        });
        if (!document) {
            return res.status(304).json({err: "Something went aaaa"});
        }

        let collaboratorEntry = document.collaborators.filter((item) => {
            return item.id.equals(curUser._id);
        });
        collaboratorEntry = collaboratorEntry[0];
        const editAccess =
            document.ownerId.equals(curUser._id) ||
            collaboratorEntry.role === "editor"
                ? true
                : false;

        const isFav = curUser.favourites.includes(document._id) ? true : false;

        return res.status(200).json({...document._doc, editAccess, isFav});
    } catch (e) {
        console.log(e);
        return res.status(500).json({message: "Something went aasdfasdfasdfs"});
    }
};

exports.addCollaborator = async (req, res) => {
    try {
        const curUser = req.user;
        const {documentId, collaboratorEmail, role} = req.body;
        console.log(req.body);

        const document = await Document.findOne({
            $or: [
                {ownerId: curUser._id},
                {collaborators: {$elemMatch: {id: curUser._id}}},
            ],
            _id: new mongoose.Types.ObjectId(documentId),
        });

        if (!document) {
            return res.status(304).json({message: "Document not found"});
        }
        if (curUser._id in document.collaborators) {
            if (document.collaborators[curUser._id].role === "viewer") {
                return res.status(304).json({
                    message: "You don't have permission add collaborator",
                });
            }
        }

        const collaborator = await User.findOne({email: collaboratorEmail});
        if (!collaborator) {
            return res
                .status(304)
                .json({message: "Invalid collaborator email"});
        }

        if (document.collaborators.includes(collaborator._id)) {
            return res
                .status(302)
                .json({message: "Collaborator already added"});
        }
        document.collaborators.push({id: collaborator._id, role: role});
        await document.save();
        return res.status(200).json({message: "Success"});
    } catch (e) {
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.getSharedDocuments = async (req, res) => {
    try {
        const curUser = req.user;
        const documents = await Document.find({
            collaborators: {$elemMatch: {id: curUser._id}},
        });
        return res.status(200).json(documents);
    } catch (e) {
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.getMyDocuments = async (req, res) => {
    try {
        const curUser = req.user;
        const documents = await Document.find({
            _id: docId,
            ownerId: curUser._id,
        });
        return res.status(200).json(documents);
    } catch (error) {
        return res.status(500).json({message: "Something went wrong"});
    }
};

exports.getCollaborators = async (req, res) => {
    try {
        const {docId} = req.query;
        const document = await Document.findOne({
            _id: new mongoose.Types.ObjectId(docId),
        }).populate("collaborators.id");

        if (!document) {
            return res.status(304).json({err: "Invalid document id"});
        }

        collaborators = document.collaborators;
        return res.status(200).json(collaborators);
    } catch (err) {
        console.log(err);
        return res.status(500).json({err: "Something went wrong"});
    }
};

exports.removeCollaborator = async (req, res) => {
    try {
        const curUser = req.user;
        const {documentId, collaboratorId} = req.body;

        const document = await Document.findOne({
            ownerId: curUser._id,
            _id: new mongoose.Types.ObjectId(documentId),
        });

        if (!document) {
            return res.status(304).json({message: "Document not found"});
        }

        const collaborator = await User.findOne({
            _id: new mongoose.Types.ObjectId(collaboratorId),
        });
        if (!collaborator) {
            return res.status(304).json({message: "Invalid collaborator id"});
        }

        let collaborators = document.collaborators.filter((item) => {
            return !item.id.equals(new mongoose.Types.ObjectId(collaboratorId));
        });
        document.collaborators = collaborators;
        await document.save();
        return res.status(200).json({success: true});
    } catch (e) {
        return res.status(500).json({message: "Something went wrong"});
    }
};
