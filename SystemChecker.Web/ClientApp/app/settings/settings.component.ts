import { Component, OnInit } from "@angular/core";
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";
import { ContactType } from "../app.enums";
import { IConnString, IContact, IContactType, IEnvironment, ILogin, ISettings } from "../app.interfaces";
import { ICanComponentDeactivate } from "../guards";
import { AppService, MessageService, UtilService } from "../services";

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/i;

export const contactValidator: ValidatorFn = async (control: AbstractControl): Promise<ValidationErrors | null> => {
    let valid = true;
    if (!control.parent) { return null; }
    switch (control.parent.value.type as ContactType) {
        case ContactType.Email:
            if (!EMAIL_REGEX.test(control.value)) {
                valid = false;
            }
            break;
        case ContactType.Phone:
            if (!PHONE_REGEX.test(control.value)) {
                valid = false;
            }
            break;
    }
    if (!valid) {
        return { invalid: true };
    } else {
        return null;
    }
};

@Component({
    templateUrl: "./settings.template.html",
    styleUrls: ["./settings.style.scss"],
})
export class SettingsComponent implements OnInit, ICanComponentDeactivate {
    public form: FormGroup;
    public settings: ISettings;
    public contactTypes: IContactType[];
    public saving: boolean = false;
    get logins(): FormArray {
        return this.form.get("logins") as FormArray;
    }
    get connStrings(): FormArray {
        return this.form.get("connStrings") as FormArray;
    }
    get environments(): FormArray {
        return this.form.get("environments") as FormArray;
    }
    get contacts(): FormArray {
        return this.form.get("contacts") as FormArray;
    }
    constructor(
        private messageService: MessageService, private appService: AppService, private formBuilder: FormBuilder,
        private utilService: UtilService,
    ) { this.createForm(); }
    public async ngOnInit() {
        try {
            this.contactTypes = await this.appService.getContactTypes();
            this.settings = await this.appService.getSettings();
            this.updateForm();
        } catch (e) {
            this.messageService.error(`Failed to load: ${e.toString()}`);
            console.error(e);
        }
    }
    public async canDeactivate() {
        return this.form.dirty ? await this.utilService.confirmNavigation() : true;
    }
    public back() {
        this.utilService.back();
    }
    public updateForm() {
        this.form.reset();

        const loginGroups = this.settings.Logins.map(login => this.formBuilder.group({
            id: login.ID,
            username: [login.Username, Validators.required],
            password: [login.Password, Validators.required],
            domain: login.Domain,
        }));
        while (this.logins.length) {
            this.logins.removeAt(0);
        }
        for (const group of loginGroups) {
            this.logins.push(group);
        }

        const connStringGroups = this.settings.ConnStrings.map(connString => this.formBuilder.group({
            id: connString.ID,
            name: [connString.Name, Validators.required],
            environment: [connString.EnvironmentID, Validators.required],
            connString: [connString.Value, Validators.required],
        }));
        while (this.connStrings.length) {
            this.connStrings.removeAt(0);
        }
        for (const group of connStringGroups) {
            this.connStrings.push(group);
        }

        const environmentGroups = this.settings.Environments.map(environment => this.formBuilder.group({
            id: environment.ID,
            name: [environment.Name, Validators.required],
        }));
        while (this.environments.length) {
            this.environments.removeAt(0);
        }
        for (const group of environmentGroups) {
            this.environments.push(group);
        }

        const contactGroups = this.settings.Contacts.map(contact => this.formBuilder.group({
            id: contact.ID,
            type: [contact.TypeID, Validators.required],
            name: [contact.Name, Validators.required],
            value: [contact.Value, Validators.required, contactValidator],
        }));
        while (this.contacts.length) {
            this.contacts.removeAt(0);
        }
        for (const group of contactGroups) {
            this.contacts.push(group);
        }

        this.form.markAsPristine();
    }
    public async save() {
        try {
            if (this.form.invalid) { return; }
            this.saving = true;
            this.settings = await this.appService.setSettings(this.modelToSettings());
            this.updateForm();
            this.messageService.success("Saved settings");
        } catch (e) {
            this.messageService.error(`Failed to save: ${e.toString()}`);
        } finally {
            this.saving = false;
        }
    }
    public addLogin() {
        this.logins.push(this.formBuilder.group({
            username: ["", Validators.required],
            password: ["", Validators.required],
            domain: "",
        }));
        this.form.markAsDirty();
    }
    public deleteLogin(index: number) {
        this.logins.removeAt(index);
        this.form.markAsDirty();
    }
    public addConnString() {
        this.connStrings.push(this.formBuilder.group({
            name: ["", Validators.required],
            environment: [undefined, Validators.required],
            connString: ["", Validators.required],
        }));
        this.form.markAsDirty();
    }
    public deleteConnString(index: number) {
        this.connStrings.removeAt(index);
        this.form.markAsDirty();
    }
    public addEnvironment() {
        this.environments.push(this.formBuilder.group({
            name: ["", Validators.required],
        }));
        this.form.markAsDirty();
    }
    public deleteEnvironment(index: number) {
        this.environments.removeAt(index);
        this.form.markAsDirty();
    }
    public addContact() {
        this.contacts.push(this.formBuilder.group({
            type: [undefined, Validators.required],
            name: ["", Validators.required],
            value: ["", Validators.required, contactValidator],
        }));
        this.form.markAsDirty();
    }
    public deleteContact(index: number) {
        this.contacts.removeAt(index);
        this.form.markAsDirty();
    }
    private modelToSettings() {
        const model = this.form.value;
        const settings: ISettings = {
            Logins: model.logins.map((login: any): ILogin => ({
                ID: login.id,
                Username: login.username,
                Password: login.password,
                Domain: login.domain,
            })),
            ConnStrings: model.connStrings.map((connString: any): IConnString => ({
                ID: connString.id,
                Name: connString.name,
                EnvironmentID: connString.environment,
                Value: connString.connString,
            })),
            Environments: model.environments.map((environment: any): IEnvironment => ({
                ID: environment.id,
                Name: environment.name,
            })),
            Contacts: model.contacts.map((contact: any): IContact => ({
                ID: contact.id,
                TypeID: contact.type,
                Name: contact.name,
                Value: contact.value,
            })),
        };
        return settings;
    }
    private createForm() {
        this.form = this.formBuilder.group({
            logins: this.formBuilder.array([]),
            connStrings: this.formBuilder.array([]),
            environments: this.formBuilder.array([]),
            contacts: this.formBuilder.array([]),
        });
    }
}
