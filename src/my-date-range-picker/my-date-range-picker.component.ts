import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges, ElementRef, Renderer, ViewChild, ChangeDetectorRef, ViewEncapsulation, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { IMyDateRange, IMyDate, IMyMonth, IMyCalendarDay, IMyCalendarMonth, IMyCalendarYear, IMyWeek, IMyDayLabels, IMyMonthLabels, IMyOptions, IMyDateRangeModel, IMyInputFieldChanged, IMyCalendarViewChanged, IMyInputFocusBlur, IMyDateSelected } from "./interfaces/index";
import { DateRangeUtilService } from "./services/my-date-range-picker.date.range.util.service";

// webpack1_
declare var require: any;
const myDrpStyles: string = require("./my-date-range-picker.component.css");
const myDrpTemplate: string = require("./my-date-range-picker.component.html");
// webpack2_

export const MYDRP_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MyDateRangePicker),
    multi: true
};

enum Year {min = 1100, max = 9100}
enum InputFocusBlur {focus = 1, blur = 2}
enum KeyCode {enter = 13, esc = 27, space = 32}
enum MonthId {prev = 1, curr = 2, next = 3}

@Component({
    selector: "my-date-range-picker",
    exportAs: "mydaterangepicker",
    styles: [myDrpStyles],
    template: myDrpTemplate,
    providers: [DateRangeUtilService, MYDRP_VALUE_ACCESSOR],
    encapsulation: ViewEncapsulation.None
})

export class MyDateRangePicker implements OnChanges, OnDestroy, ControlValueAccessor {
    @Input() options: any;
    @Input() defaultMonth: string;
    @Input() selDateRange: string;
    @Input() placeholder: string;
    @Output() dateRangeChanged: EventEmitter<IMyDateRangeModel> = new EventEmitter<IMyDateRangeModel>();
    @Output() inputFieldChanged: EventEmitter<IMyInputFieldChanged> = new EventEmitter<IMyInputFieldChanged>();
    @Output() calendarViewChanged: EventEmitter<IMyCalendarViewChanged> = new EventEmitter<IMyCalendarViewChanged>();
    @Output() inputFocusBlur: EventEmitter<IMyInputFocusBlur> = new EventEmitter<IMyInputFocusBlur>();
    @Output() dateSelected: EventEmitter<IMyDateSelected> = new EventEmitter<IMyDateSelected>();
    @ViewChild("selectorEl") selectorEl: any;

    onChangeCb: (_: any) => void = () => { };
    onTouchedCb: () => void = () => { };

    showSelector: boolean = false;
    visibleMonth: IMyMonth = {monthTxt: "", monthNbr: 0, year: 0};
    selectedMonth: IMyMonth = {monthTxt: "", monthNbr: 0, year: 0};
    weekDays: Array<string> = [];
    dates: Array<IMyWeek> = [];
    months: Array<Array<IMyCalendarMonth>> = [];
    years: Array<Array<IMyCalendarYear>> = [];
    selectionDayTxt: string = "";
    invalidDateRange: boolean = false;
    dateRangeFormat: string = "";
    dayIdx: number = 0;
    weekDayOpts: Array<string> = ["su", "mo", "tu", "we", "th", "fr", "sa"];

    selectMonth: boolean = false;
    selectYear: boolean = false;

    prevMonthDisabled: boolean = false;
    nextMonthDisabled: boolean = false;
    prevYearDisabled: boolean = false;
    nextYearDisabled: boolean = false;
    prevYearsDisabled: boolean = false;
    nextYearsDisabled: boolean = false;

    prevMonthId: number = MonthId.prev;
    currMonthId: number = MonthId.curr;
    nextMonthId: number = MonthId.next;

    beginDate: IMyDate = {year: 0, month: 0, day: 0};
    endDate: IMyDate = {year: 0, month: 0, day: 0};
    titleAreaText: string = "";

    globalListener: Function;

    // Default options
    opts: IMyOptions = {
        dayLabels: <IMyDayLabels> {su: "Sun", mo: "Mon", tu: "Tue", we: "Wed", th: "Thu", fr: "Fri", sa: "Sat"},
        monthLabels: <IMyMonthLabels> {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"},
        dateFormat: <string> "yyyy-mm-dd",
        showClearBtn: <boolean> true,
        showApplyBtn: <boolean> true,
        showSelectDateText: <boolean> true,
        selectBeginDateTxt: <string> "Select Begin Date",
        selectEndDateTxt: <string> "Select End Date",
        firstDayOfWeek: <string> "mo",
        sunHighlight: <boolean> true,
        markCurrentDay: <boolean> true,
        markCurrentMonth: <boolean> true,
        markCurrentYear: <boolean> true,
        height: <string> "34px",
        width: <string> "262px",
        selectorHeight: <string> "232px",
        selectorWidth: <string> "252px",
        inline: <boolean> false,
        showClearDateRangeBtn: <boolean> true,
        selectionTxtFontSize: <string> "14px",
        alignSelectorRight: <boolean> false,
        indicateInvalidDateRange: <boolean> true,
        editableDateRangeField: <boolean> true,
        monthSelector: <boolean> true,
        yearSelector: <boolean> true,
        disableHeaderButtons: <boolean> true,
        showWeekNumbers: <boolean> false,
        minYear: <number> Year.min,
        maxYear: <number> Year.max,
        disableUntil: <IMyDate> {year: 0, month: 0, day: 0},
        disableSince: <IMyDate> {year: 0, month: 0, day: 0},
        disableDates: <Array<IMyDate>> [],
        enableDates: <Array<IMyDate>> [],
        disableDateRanges: <Array<IMyDateRange>> [],
        componentDisabled: <boolean> false,
        showSelectorArrow: <boolean> true,
        openSelectorOnInputClick: <boolean> false,
        ariaLabelInputField: <string> "Date range input field",
        ariaLabelClearDateRange: <string> "Clear date range",
        ariaLabelOpenCalendar: <string> "Open Calendar",
        ariaLabelPrevMonth: <string> "Previous Month",
        ariaLabelNextMonth: <string> "Next Month",
        ariaLabelPrevYear: <string> "Previous Year",
        ariaLabelNextYear: <string> "Next Year"
    };

    constructor(public elem: ElementRef, private renderer: Renderer, private cdr: ChangeDetectorRef, private drus: DateRangeUtilService) {
        this.globalListener = renderer.listenGlobal("document", "click", (event: any) => {
            if (this.showSelector && event.target && this.elem.nativeElement !== event.target && !this.elem.nativeElement.contains(event.target)) {
                this.showSelector = false;
            }
            if (this.opts.monthSelector || this.opts.yearSelector) {
                this.resetMonthYearSelect();
            }
        });
    }

    resetMonthYearSelect(): void {
        this.selectMonth = false;
        this.selectYear = false;
    }

    onSelectMonthClicked(event: any): void {
        event.stopPropagation();
        this.selectMonth = !this.selectMonth;
        this.selectYear = false;
        this.cdr.detectChanges();
        if (this.selectMonth) {
            let today: IMyDate = this.getToday();
            this.months.length = 0;
            for (let i = 1; i <= 12; i += 3) {
                let row: Array<IMyCalendarMonth> = [];
                for (let j = i; j < i + 3; j++) {
                    let disabled: boolean = this.drus.isMonthDisabledByDisableUntil({year: this.visibleMonth.year, month: j, day: this.daysInMonth(j, this.visibleMonth.year)}, this.opts.disableUntil)
                        || this.drus.isMonthDisabledByDisableSince({year: this.visibleMonth.year, month: j, day: 1}, this.opts.disableSince);
                    row.push({nbr: j, name: this.opts.monthLabels[j], currMonth: j === today.month && this.visibleMonth.year === today.year, selected: j === this.visibleMonth.monthNbr, disabled: disabled});
                }
                this.months.push(row);
            }
        }
    }

    onMonthCellClicked(cell: IMyCalendarMonth): void {
        let mc: boolean = cell.nbr !== this.visibleMonth.monthNbr;
        this.visibleMonth = {monthTxt: this.monthText(cell.nbr), monthNbr: cell.nbr, year: this.visibleMonth.year};
        this.generateCalendar(cell.nbr, this.visibleMonth.year, mc);
        this.selectMonth = false;
        this.selectorEl.nativeElement.focus();
    }

    onMonthCellKeyDown(event: any, cell: IMyCalendarMonth) {
        if ((event.keyCode === KeyCode.enter || event.keyCode === KeyCode.space) && !cell.disabled) {
            event.preventDefault();
            this.onMonthCellClicked(cell);
        }
    }

    onSelectYearClicked(event: any): void {
        event.stopPropagation();
        this.selectYear = !this.selectYear;
        this.selectMonth = false;
        this.cdr.detectChanges();
        if (this.selectYear) {
            this.generateYears(this.visibleMonth.year);
        }
    }

    onYearCellClicked(cell: IMyCalendarYear): void {
        let yc: boolean = cell.year !== this.visibleMonth.year;
        this.visibleMonth = {monthTxt: this.visibleMonth.monthTxt, monthNbr: this.visibleMonth.monthNbr, year: cell.year};
        this.generateCalendar(this.visibleMonth.monthNbr, cell.year, yc);
        this.selectYear = false;
        this.selectorEl.nativeElement.focus();
    }

    onYearCellKeyDown(event: any, cell: IMyCalendarYear) {
        if ((event.keyCode === KeyCode.enter || event.keyCode === KeyCode.space) && !cell.disabled) {
            event.preventDefault();
            this.onYearCellClicked(cell);
        }
    }

    onPrevYears(event: any, year: number): void {
        event.stopPropagation();
        this.generateYears(year - 25);
    }

    onNextYears(event: any, year: number): void {
        event.stopPropagation();
        this.generateYears(year + 25);
    }

    generateYears(year: number): void {
        this.years.length = 0;
        let today: IMyDate = this.getToday();
        for (let i = year; i <= 20 + year; i += 5) {
            let row: Array<IMyCalendarYear> = [];
            for (let j = i; j < i + 5; j++) {
                let disabled: boolean = this.drus.isMonthDisabledByDisableUntil({year: j, month: 12, day: this.daysInMonth(12, j)}, this.opts.disableUntil)
                    || this.drus.isMonthDisabledByDisableSince({year: j, month: 1, day: 1}, this.opts.disableSince);
                let minMax: boolean = j < this.opts.minYear || j > this.opts.maxYear;
                row.push({year: j, currYear: j === today.year, selected: j === this.visibleMonth.year, disabled: disabled || minMax});
            }
            this.years.push(row);
        }
        this.prevYearsDisabled = this.years[0][0].year <= this.opts.minYear || this.drus.isMonthDisabledByDisableUntil({year: this.years[0][0].year - 1, month: 12, day: this.daysInMonth(12, this.years[0][0].year - 1)}, this.opts.disableUntil);
        this.nextYearsDisabled = this.years[4][4].year >= this.opts.maxYear || this.drus.isMonthDisabledByDisableSince({year: this.years[4][4].year + 1, month: 1, day: 1}, this.opts.disableSince);
    }

    onUserDateRangeInput(value: string): void {
        this.invalidDateRange = false;
        if (value.length === 0) {
            if (this.drus.isInitializedDate(this.beginDate) && this.drus.isInitializedDate(this.endDate)) {
                this.clearDateRange();
            }
            else {
                this.inputFieldChanged.emit({value: value, dateRangeFormat: this.dateRangeFormat, valid: false});
            }
        }
        else {
            let daterange: IMyDateRange = this.drus.isDateRangeValid(value, this.opts.dateFormat, this.opts.minYear, this.opts.maxYear, this.opts.disableUntil, this.opts.disableSince, this.opts.disableDates, this.opts.disableDateRanges, this.opts.enableDates, this.opts.monthLabels);
            if (this.drus.isInitializedDate(daterange.beginDate) && this.drus.isInitializedDate(daterange.endDate)) {
                this.beginDate = daterange.beginDate;
                this.endDate = daterange.endDate;
                this.rangeSelected();
            }
            else {
                this.invalidDateRange = true;
                this.onChangeCb(null);
                this.onTouchedCb();
                this.inputFieldChanged.emit({value: value, dateRangeFormat: this.dateRangeFormat, valid: false});
            }
        }
    }

    onFocusInput(event: any): void {
        this.inputFocusBlur.emit({reason: InputFocusBlur.focus, value: event.target.value});
    }

    onBlurInput(event: any): void {
        this.selectionDayTxt = event.target.value;
        this.onTouchedCb();
        this.inputFocusBlur.emit({reason: InputFocusBlur.blur, value: event.target.value});
    }

    onCloseSelector(event: any): void {
        if (event.keyCode === KeyCode.esc && this.showSelector && !this.opts.inline) {
            this.showSelector = false;
        }
    }

    parseOptions(): void {
        if (this.options !== undefined) {
            Object.keys(this.options).forEach((k) => {
                (<IMyOptions>this.opts)[k] = this.options[k];
            });
        }

        if (this.opts.minYear < Year.min) {
            this.opts.minYear = Year.min;
        }
        if (this.opts.maxYear > Year.max) {
            this.opts.maxYear = Year.max;
        }

        this.dateRangeFormat = this.opts.dateFormat + " - " + this.opts.dateFormat;

        this.dayIdx = this.weekDayOpts.indexOf(this.opts.firstDayOfWeek);
        if (this.dayIdx !== -1) {
            let idx: number = this.dayIdx;
            for (let i = 0; i < this.weekDayOpts.length; i++) {
                this.weekDays.push(this.opts.dayLabels[this.weekDayOpts[idx]]);
                idx = this.weekDayOpts[idx] === "sa" ? 0 : idx + 1;
            }
        }
    }

    writeValue(value: Object): void {
        if (value && value["beginDate"] && value["endDate"]) {
            this.beginDate = this.parseSelectedDate(value["beginDate"]);
            this.endDate = this.parseSelectedDate(value["endDate"]);
            let begin: string = this.formatDate(this.beginDate);
            let end: string = this.formatDate(this.endDate);
            this.selectionDayTxt = begin + " - " + end;
            this.titleAreaText = this.selectionDayTxt;
            this.inputFieldChanged.emit({value: this.selectionDayTxt, dateRangeFormat: this.dateRangeFormat, valid: true});
        }
        else if (value === null || value === "") {
            this.clearRangeValues();
            this.inputFieldChanged.emit({value: "", dateRangeFormat: this.dateRangeFormat, valid: false});
        }
        this.invalidDateRange = false;
    }

    setDisabledState(disabled: boolean): void {
        this.opts.componentDisabled = disabled;
    }

    registerOnChange(fn: any): void {
        this.onChangeCb = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouchedCb = fn;
    }

    ngOnDestroy(): void {
        this.globalListener();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.hasOwnProperty("placeholder")) {
            this.placeholder = changes["placeholder"].currentValue;
        }

        if (changes.hasOwnProperty("options")) {
            this.options = changes["options"].currentValue;
            this.weekDays.length = 0;
            this.parseOptions();
        }

        let dmChange: boolean = false;
        if (changes.hasOwnProperty("defaultMonth")) {
            let dm: any = changes["defaultMonth"].currentValue;
            if (typeof dm === "object") {
                dm = dm.defMonth;
            }
            if (dm !== null && dm !== undefined && dm !== "") {
                this.selectedMonth = this.parseSelectedMonth(dm);
            }
            else {
                this.selectedMonth = {monthTxt: "", monthNbr: 0, year: 0};
            }
            dmChange = true;
        }

        if (changes.hasOwnProperty("selDateRange")) {
            let sdr: any = changes["selDateRange"];
            if (sdr.currentValue !== null && sdr.currentValue !== undefined && sdr.currentValue !== "") {
                if (typeof sdr.currentValue === "string") {
                    let split: Array<string> = sdr.currentValue.split(" - ");
                    this.beginDate = this.parseSelectedDate(split[0]);
                    this.endDate = this.parseSelectedDate(split[1]);
                    this.selectionDayTxt = sdr.currentValue;
                }
                else if (typeof sdr.currentValue === "object") {
                    this.beginDate = this.parseSelectedDate(sdr.currentValue["beginDate"]);
                    this.endDate = this.parseSelectedDate(sdr.currentValue["endDate"]);
                    this.selectionDayTxt = this.formatDate(this.beginDate) + " - " + this.formatDate(this.endDate);
                }
                this.titleAreaText = this.selectionDayTxt;
                setTimeout(() => {
                    this.onChangeCb(this.getDateRangeModel(this.beginDate, this.endDate));
                });
                this.toBeginDate();
            }
            else {
                // Do not clear on init
                if (!sdr.isFirstChange()) {
                    this.clearDateRange();
                }
            }
        }
        if (this.visibleMonth.year === 0 && this.visibleMonth.monthNbr === 0 || dmChange) {
            this.setVisibleMonth();
        }
        else {
            this.visibleMonth.monthTxt = this.opts.monthLabels[this.visibleMonth.monthNbr];
            this.generateCalendar(this.visibleMonth.monthNbr, this.visibleMonth.year, false);
        }
    }

    removeBtnClicked(): void {
        this.clearDateRange();
    }

    openBtnClicked(): void {
        this.showSelector = !this.showSelector;
        this.cdr.detectChanges();
        if (this.showSelector) {
            this.setVisibleMonth();
        }
    }

    setVisibleMonth(): void {
        if (this.drus.isInitializedDate(this.beginDate)) {
            this.toBeginDate();
        }
        else {
            let y: number = 0, m: number = 0;
            if (this.selectedMonth.year === 0 && this.selectedMonth.monthNbr === 0) {
                let today: IMyDate = this.getToday();
                y = today.year;
                m = today.month;
            } else {
                y = this.selectedMonth.year;
                m = this.selectedMonth.monthNbr;
            }
            this.visibleMonth = {monthTxt: this.opts.monthLabels[m], monthNbr: m, year: y};
            this.generateCalendar(m, y, true);
        }
    }

    onPrevMonth(): void {
        let d: Date = this.getDate({year: this.visibleMonth.year, month: this.visibleMonth.monthNbr, day: 1});
        d.setMonth(d.getMonth() - 1);

        let y: number = d.getFullYear();
        let m: number = d.getMonth() + 1;

        this.visibleMonth = {monthTxt: this.monthText(m), monthNbr: m, year: y};
        this.generateCalendar(m, y, true);
    }

    onNextMonth(): void {
        let d: Date = this.getDate({year: this.visibleMonth.year, month: this.visibleMonth.monthNbr, day: 1});
        d.setMonth(d.getMonth() + 1);

        let y: number = d.getFullYear();
        let m: number = d.getMonth() + 1;

        this.visibleMonth = {monthTxt: this.monthText(m), monthNbr: m, year: y};
        this.generateCalendar(m, y, true);
    }

    onPrevYear(): void {
        if (this.visibleMonth.year - 1 < this.opts.minYear) {
            return;
        }
        this.visibleMonth.year--;
        this.generateCalendar(this.visibleMonth.monthNbr, this.visibleMonth.year, true);
    }

    onNextYear(): void {
        if (this.visibleMonth.year + 1 > this.opts.maxYear) {
            return;
        }
        this.visibleMonth.year++;
        this.generateCalendar(this.visibleMonth.monthNbr, this.visibleMonth.year, true);
    }

    clearRangeValues(): void {
        // Clear button selected
        this.invalidDateRange = false;
        this.selectionDayTxt = "";
        this.beginDate = {year: 0, month: 0, day: 0};
        this.endDate = {year: 0, month: 0, day: 0};
        this.titleAreaText = this.opts.selectBeginDateTxt;
        this.generateCalendar(this.visibleMonth.monthNbr, this.visibleMonth.year, false);
    }

    onCellClicked(cell: any): void {
        // Cell clicked in the selector
        let bi: boolean = this.drus.isInitializedDate(this.beginDate);
        let ei: boolean = this.drus.isInitializedDate(this.endDate);
        if (ei) {
            this.beginDate = {year: 0, month: 0, day: 0};
            this.endDate = {year: 0, month: 0, day: 0};
            this.titleAreaText = this.opts.selectBeginDateTxt;
            bi = false;
            ei = false;
        }
        if (!ei) {
            if (!bi || bi && this.drus.getTimeInMilliseconds(cell.dateObj) < this.drus.getTimeInMilliseconds(this.beginDate)) {
                this.selectBeginDate(cell.dateObj);
                this.titleAreaText = this.formatDate(cell.dateObj) + " - " + this.opts.selectEndDateTxt;
            }
            else if (this.drus.getTimeInMilliseconds(cell.dateObj) >= this.drus.getTimeInMilliseconds(this.beginDate)) {
                this.selectEndDate(cell.dateObj);
                this.rangeSelected();
                this.titleAreaText = this.formatDate(this.beginDate) + " - " + this.formatDate(cell.dateObj);
            }
        }
    }

    selectBeginDate(date: IMyDate): void {
        this.beginDate = date;
        let formatted: string = this.formatDate(date);
        this.titleAreaText = formatted + " - " + this.opts.selectEndDateTxt;
        this.dateSelected.emit({type: 1, date: date, formatted: formatted, jsdate: this.getDate(date)});
    }

    selectEndDate(date: IMyDate): void {
        this.endDate = date;
        let formatted: string = this.formatDate(date);
        this.titleAreaText = this.formatDate(this.beginDate) + " - " + formatted;
        this.dateSelected.emit({type: 2, date: date, formatted: formatted, jsdate: this.getDate(date)});
    }

    onCellKeyDown(event: any, cell: any): void {
        if ((event.keyCode === KeyCode.enter || event.keyCode === KeyCode.space) && !cell.disabled) {
            event.preventDefault();
            this.onCellClicked(cell);
        }
    }

    onCellMouseEnter(cell: any): void {
        if (this.drus.isInitializedDate(this.beginDate) && !this.drus.isInitializedDate(this.endDate)) {
            for (let w of this.dates) {
                for (let day of w.week) {
                    day.range = this.drus.getTimeInMilliseconds(day.dateObj) >= this.drus.getTimeInMilliseconds(this.beginDate)
                        && this.drus.getTimeInMilliseconds(day.dateObj) <= this.drus.getTimeInMilliseconds(cell.dateObj);
                }
            }
        }
    }

    onCellMouseLeave(): void {
        for (let w of this.dates) {
            for (let day of w.week) {
                day.range = false;
            }
        }
    }

    toBeginDate(): void {
        // To begin date clicked
        let viewChange: boolean = this.beginDate.year !== this.visibleMonth.year || this.beginDate.month !== this.visibleMonth.monthNbr;
        this.visibleMonth = {monthTxt: this.monthText(this.beginDate.month), monthNbr: this.beginDate.month, year: this.beginDate.year};
        this.generateCalendar(this.beginDate.month, this.beginDate.year, viewChange);
    }

    clearDateRange(): void {
        if (this.drus.isInitializedDate(this.endDate)) {
            this.dateRangeChanged.emit({beginDate: {year: 0, month: 0, day: 0}, beginJsDate: null, endDate: {year: 0, month: 0, day: 0}, endJsDate: null, formatted: "", beginEpoc: 0, endEpoc: 0});
            if (this.selectionDayTxt !== "") {
                this.inputFieldChanged.emit({value: "", dateRangeFormat: this.dateRangeFormat, valid: false});
            }
            this.onChangeCb(null);
            this.onTouchedCb();
        }
        this.clearRangeValues();
    }

    rangeSelected(): void {
        // Accept button clicked
        let dateRangeModel: IMyDateRangeModel = this.getDateRangeModel(this.beginDate, this.endDate);
        this.selectionDayTxt = this.formatDate(this.beginDate) + " - " + this.formatDate(this.endDate);
        this.showSelector = false;
        this.dateRangeChanged.emit(dateRangeModel);
        this.inputFieldChanged.emit({value: this.selectionDayTxt, dateRangeFormat: this.dateRangeFormat, valid: true});
        this.onChangeCb(dateRangeModel);
        this.onTouchedCb();
        this.invalidDateRange = false;
        if (this.opts.monthSelector || this.opts.yearSelector) {
            this.resetMonthYearSelect();
        }
    }

    getDateRangeModel(beginDate: IMyDate, endDate: IMyDate): IMyDateRangeModel {
        // Creates a date range model object from the given parameters
        let bEpoc: number = this.drus.getTimeInMilliseconds(beginDate) / 1000.0;
        let eEpoc: number = this.drus.getTimeInMilliseconds(endDate) / 1000.0;
        return {beginDate: beginDate, beginJsDate: this.getDate(beginDate), endDate: endDate, endJsDate: this.getDate(endDate), formatted: this.formatDate(beginDate) + " - " + this.formatDate(endDate), beginEpoc: bEpoc, endEpoc: eEpoc};
    }

    isInRange(val: any): boolean {
        // Check is input date in range between the beginDate and the endDate
        if (!this.drus.isInitializedDate(this.beginDate) || !this.drus.isInitializedDate(this.endDate)) {
            return false;
        }

        let input: number = this.drus.getTimeInMilliseconds(val.dateObj);
        if (input >= this.drus.getTimeInMilliseconds(this.beginDate) && input <= this.drus.getTimeInMilliseconds(this.endDate)) {
            return true;
        }
        return false;
    }

    isRangeSelected(): boolean {
        // Check is both beginDate and the endDate selected
        if (this.drus.isInitializedDate(this.beginDate) && this.drus.isInitializedDate(this.endDate)) {
            return true;
        }
        return false;
    }

    preZero(val: string): string {
        // Prepend zero if smaller than 10
        return parseInt(val) < 10 ? "0" + val : val;
    }

    formatDate(val: any): string {
        // Returns formatted date string, if mmm is part of dateFormat returns month as a string
        let formatted: string = this.opts.dateFormat.replace("yyyy", val.year).replace("dd", this.preZero(val.day));
        return this.opts.dateFormat.indexOf("mmm") !== -1 ? formatted.replace("mmm", this.monthText(val.month)) : formatted.replace("mm", this.preZero(val.month));
    }

    monthText(m: number): string {
        // Returns month as a text
        return this.opts.monthLabels[m];
    }

    monthStartIdx(y: number, m: number): number {
        // Month start index
        let d: Date = new Date();
        d.setDate(1);
        d.setMonth(m - 1);
        d.setFullYear(y);
        let idx = d.getDay() + this.sundayIdx();
        return idx >= 7 ? idx - 7 : idx;
    }

    daysInMonth(m: number, y: number): number {
        // Return number of days of current month
        return new Date(y, m, 0).getDate();
    }

    daysInPrevMonth(m: number, y: number): number {
        let d: Date = this.getDate({year: y, month: m, day: 1});
        d.setMonth(d.getMonth() - 1);
        return this.daysInMonth(d.getMonth() + 1, d.getFullYear());
    }

    isCurrDay(d: number, m: number, y: number, cmo: number, today: IMyDate): boolean {
        // Check is a given date the current date
        return d === today.day && m === today.month && y === today.year && cmo === this.currMonthId;
    }

    getPreviousDate(date: IMyDate): IMyDate {
        // Get previous date from the given date
        let d: Date = this.getDate(date);
        d.setDate(d.getDate() - 1);
        return {year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate()};
    }

    getNextDate(date: IMyDate): IMyDate {
        // Get next date from the given date
        let d: Date = this.getDate(date);
        d.setDate(d.getDate() + 1);
        return {year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate()};
    }

    getDayNumber(date: IMyDate): number {
        // Get day number: sun=0, mon=1, tue=2, wed=3 ...
        let d: Date = this.getDate(date);
        return d.getDay();
    }

    getWeekday(date: IMyDate): string {
        // Get weekday: su, mo, tu, we ...
        return this.weekDayOpts[this.getDayNumber(date)];
    }

    getDate(date: IMyDate): Date {
        return new Date(date.year, date.month - 1, date.day, 0, 0, 0, 0);
    }

    getToday(): IMyDate {
        let date: Date = new Date();
        return {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()};
    }

    sundayIdx(): number {
        // Index of Sunday day
        return this.dayIdx > 0 ? 7 - this.dayIdx : 0;
    }

    generateCalendar(m: number, y: number, viewChange: boolean): void {
        this.dates.length = 0;
        let today: IMyDate = this.getToday();
        let monthStart: number = this.monthStartIdx(y, m);
        let dInThisM: number = this.daysInMonth(m, y);
        let dInPrevM: number = this.daysInPrevMonth(m, y);

        let dayNbr: number = 1;
        let cmo: number = this.prevMonthId;
        for (let i = 1; i < 7; i++) {
            let week: Array<IMyCalendarDay> = [];
            if (i === 1) {
                // First week
                let pm: number = dInPrevM - monthStart + 1;
                // Previous month
                for (let j = pm; j <= dInPrevM; j++) {
                    let date: IMyDate = {year: m === 1 ? y - 1 : y, month: m === 1 ? 12 : m - 1, day: j};
                    week.push({dateObj: date,
                        cmo: cmo, currDay: this.isCurrDay(j, m, y, cmo, today),
                        dayNbr: this.getDayNumber(date),
                        disabled: this.drus.isDisabledDay(date, this.opts.minYear, this.opts.maxYear, this.opts.disableUntil, this.opts.disableSince, this.opts.disableDates, this.opts.disableDateRanges, this.opts.enableDates),
                        range: false});
                }
                cmo = this.currMonthId;
                // Current month
                let daysLeft: number = 7 - week.length;
                for (let j = 0; j < daysLeft; j++) {
                    let date: IMyDate = {year: y, month: m, day: dayNbr};
                    week.push({dateObj: date,
                        cmo: cmo,
                        currDay: this.isCurrDay(dayNbr, m, y, cmo, today),
                        dayNbr: this.getDayNumber(date),
                        disabled: this.drus.isDisabledDay(date, this.opts.minYear, this.opts.maxYear, this.opts.disableUntil, this.opts.disableSince, this.opts.disableDates, this.opts.disableDateRanges, this.opts.enableDates),
                        range: false});
                    dayNbr++;
                }
            }
            else {
                // Rest of the weeks
                for (let j = 1; j < 8; j++) {
                    if (dayNbr > dInThisM) {
                        // Next month
                        dayNbr = 1;
                        cmo = this.nextMonthId;
                    }
                    let date: IMyDate = {year: cmo === this.nextMonthId && m === 12 ? y + 1 : y, month: cmo === this.currMonthId ? m : cmo === this.nextMonthId && m < 12 ? m + 1 : 1, day: dayNbr};
                    week.push({dateObj: date,
                        cmo: cmo,
                        currDay: this.isCurrDay(dayNbr, m, y, cmo, today),
                        dayNbr: this.getDayNumber(date),
                        disabled: this.drus.isDisabledDay(date, this.opts.minYear, this.opts.maxYear, this.opts.disableUntil, this.opts.disableSince, this.opts.disableDates, this.opts.disableDateRanges, this.opts.enableDates),
                        range: false});
                    dayNbr++;
                }
            }
            let weekNbr: number = this.opts.showWeekNumbers  && this.opts.firstDayOfWeek === "mo" ? this.drus.getWeekNumber(week[0].dateObj) : 0;
            this.dates.push({week: week, weekNbr: weekNbr});
        }

        this.setHeaderBtnDisabledState(m, y);

        if (viewChange) {
            // Notify parent
            this.calendarViewChanged.emit({year: y, month: m, first: {number: 1, weekday: this.getWeekday({year: y, month: m, day: 1})}, last: {number: dInThisM, weekday: this.getWeekday({year: y, month: m, day: dInThisM})}});
        }
    }

    setHeaderBtnDisabledState(m: number, y: number): void {
        let dpm: boolean = false;
        let dpy: boolean = false;
        let dnm: boolean = false;
        let dny: boolean = false;
        if (this.opts.disableHeaderButtons) {
            dpm = this.drus.isMonthDisabledByDisableUntil({year: m === 1 ? y - 1 : y, month: m === 1 ? 12 : m - 1, day: this.daysInMonth(m === 1 ? 12 : m - 1, m === 1 ? y - 1 : y)}, this.opts.disableUntil);
            dpy = this.drus.isMonthDisabledByDisableUntil({year: y - 1, month: m, day: this.daysInMonth(m, y - 1)}, this.opts.disableUntil);
            dnm = this.drus.isMonthDisabledByDisableSince({year: m === 12 ? y + 1 : y, month: m === 12 ? 1 : m + 1, day: 1}, this.opts.disableSince);
            dny = this.drus.isMonthDisabledByDisableSince({year: y + 1, month: m, day: 1}, this.opts.disableSince);
        }
        this.prevMonthDisabled = m === 1 && y === this.opts.minYear || dpm;
        this.prevYearDisabled = y - 1 < this.opts.minYear || dpy;
        this.nextMonthDisabled = m === 12 && y === this.opts.maxYear || dnm;
        this.nextYearDisabled = y + 1 > this.opts.maxYear || dny;
    }

    parseSelectedDate(selDate: any): IMyDate {
        // Parse selDate value - it can be string or IMyDate object
        let date: IMyDate = {day: 0, month: 0, year: 0};
        if (typeof selDate === "string") {
            let sd: string = <string>selDate;
            date.day = this.drus.parseDatePartNumber(this.opts.dateFormat, sd, "dd");

            date.month = this.opts.dateFormat.indexOf("mmm") !== -1
                ? this.drus.parseDatePartMonthName(this.opts.dateFormat, sd, "mmm", this.opts.monthLabels)
                : this.drus.parseDatePartNumber(this.opts.dateFormat, sd, "mm");

            date.year = this.drus.parseDatePartNumber(this.opts.dateFormat, sd, "yyyy");
        }
        else if (typeof selDate === "object") {
            date = selDate;
        }
        return date;
    }

    parseSelectedMonth(ms: string): IMyMonth {
        return this.drus.parseDefaultMonth(ms);
    }
}
