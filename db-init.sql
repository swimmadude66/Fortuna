CREATE DATABASE IF NOT EXISTS `fortuna` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `fortuna`;

CREATE TABLE IF NOT EXISTS `users` (
  `UserId` int(11) NOT NULL AUTO_INCREMENT,
  `Email` varchar(128) NOT NULL,
  `PassHash` varchar(128) NOT NULL,
  `Salt` varchar(64) NOT NULL,
  `Confirm` varchar(64) DEFAULT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `UserId_UNIQUE` (`UserId`),
  UNIQUE KEY `Email_UNIQUE` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `SessionId` int(11) NOT NULL AUTO_INCREMENT,
  `SessionKey` varchar(32) NOT NULL,
  `UserId` int(11) NOT NULL,
  `Expires` bigint(20) NOT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  `Created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `LastUsed` bigint(20) NOT NULL,
  `UserAgent` text,
  PRIMARY KEY (`SessionId`),
  UNIQUE KEY `SessionId_UNIQUE` (`SessionId`),
  UNIQUE KEY `SessionKey_UNIQUE` (`SessionKey`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workspaces` (
  `WorkspaceId` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(45) NOT NULL,
  `Logo` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`WorkspaceId`),
  UNIQUE KEY `Name_UNIQUE` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workspace_users` (
  `WorkspaceUserId` int(11) NOT NULL AUTO_INCREMENT,
  `WorkspaceId` int(11) NOT NULL,
  `UserId` int(11) DEFAULT NULL,
  `Role` enum('Member','Admin') NOT NULL DEFAULT 'Member',
  PRIMARY KEY (`WorkspaceUserId`),
  UNIQUE KEY `noDup` (`UserId`,`WorkspaceId`),
  KEY `Workspace_idx` (`WorkspaceId`),
  KEY `User_idx` (`UserId`),
  CONSTRAINT `User` FOREIGN KEY (`UserId`) REFERENCES `users` (`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `UserWorkspace` FOREIGN KEY (`WorkspaceId`) REFERENCES `workspaces` (`WorkspaceId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `experiments` (
  `ExperimentId` int(11) NOT NULL AUTO_INCREMENT,
  `WorkspaceId` int(11) NOT NULL,
  `Name` varchar(45) NOT NULL,
  `Description` text,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  `Endpoint` varchar(64) NOT NULL,
  `APIKeyHash` varchar(128) NOT NULL,
  `APIKeySalt` varchar(64) NOT NULL,
  PRIMARY KEY (`ExperimentId`),
  KEY `ExperimentWorkspace_idx` (`WorkspaceId`),
  CONSTRAINT `ExperimentWorkspace` FOREIGN KEY (`WorkspaceId`) REFERENCES `workspaces` (`WorkspaceId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `outcomes` (
  `OutcomeId` int(11) NOT NULL AUTO_INCREMENT,
  `ExperimentId` int(11) NOT NULL,
  `Value` text NOT NULL,
  `Description` text,
  `Weight` int(11) NOT NULL,
  PRIMARY KEY (`OutcomeId`),
  KEY `parentExperiment_idx` (`ExperimentId`),
  CONSTRAINT `parentExperiment` FOREIGN KEY (`ExperimentId`) REFERENCES `experiments` (`ExperimentId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subjects` (
  `SubjectId` int(11) NOT NULL AUTO_INCREMENT,
  `ExperimentId` int(11) NOT NULL,
  `Identifier` varchar(128) DEFAULT NULL,
  `AnonymousIdentifier` varchar(128) NOT NULL,
  PRIMARY KEY (`SubjectId`),
  UNIQUE KEY `inExpOnce` (`ExperimentId`,`SubjectId`),
  KEY `ExperimentSubject_idx` (`ExperimentId`),
  KEY `anonymousId` (`AnonymousIdentifier`),
  CONSTRAINT `ExperimentSubject` FOREIGN KEY (`ExperimentId`) REFERENCES `experiments` (`ExperimentId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `results` (
  `ResultId` int(11) NOT NULL AUTO_INCREMENT,
  `ExperimentId` int(11) NOT NULL,
  `OutcomeId` int(11) DEFAULT NULL,
  `SubjectId` int(11) DEFAULT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`ResultId`),
  KEY `ExperimentResult_idx` (`ExperimentId`),
  KEY `ExperimentSubject_idx` (`SubjectId`),
  KEY `OutcomeResult_idx` (`OutcomeId`),
  CONSTRAINT `ExperimentResult` FOREIGN KEY (`ExperimentId`) REFERENCES `experiments` (`ExperimentId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `OutcomeResult` FOREIGN KEY (`OutcomeId`) REFERENCES `outcomes` (`OutcomeId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `SubjectResult` FOREIGN KEY (`SubjectId`) REFERENCES `subjects` (`SubjectId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

