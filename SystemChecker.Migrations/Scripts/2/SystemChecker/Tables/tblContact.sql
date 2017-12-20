﻿IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='tblContact') BEGIN
	CREATE TABLE tblContact (
		ID INT IDENTITY(1,1) PRIMARY KEY,
        TypeID INT NOT NULL,
		Name VARCHAR(255) NOT NULL,
		Value VARCHAR(255) NOT NULL,
		CONSTRAINT FK_tblContact_tblContactType FOREIGN KEY (TypeID) REFERENCES dbo.tblContactType
	)
END