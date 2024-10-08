import { Component,OnInit,Injectable,inject, Input, ViewChild } from '@angular/core';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
//import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { UploadComponent } from '../misc/upload/upload.component';
import { DataTableComponent } from '../misc/data-table/data-table.component';
import { GlobalService } from '../service/global/global.service';
import { GlobalVar } from '../globalVar'
import { DynamicTableComponent } from '../misc/dynamic-table/dynamic-table.component';
import { DynamicModalComponent } from '../misc/dynamic-modal/dynamic-modal.component';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder,FormControl, FormGroup, Validators } from '@angular/forms';
import { StockValidators } from '../shared/formValidator';
import { GlobalValidator } from '../shared/formValidator';
import { ColDef } from 'ag-grid-community';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})

export class StockComponent {

	public fDebug:boolean=false;
	public version:string="0.18.0"
	private globalService:GlobalService=inject(GlobalService);
	private dbKey=GlobalVar.dbKey;
	public socket:Socket=inject(Socket);
	public currentPage=this.globalService.getCurrentPage(); // >>dbName
	public downloadExcel = this.globalService.downloadExcel;
	public JSON=JSON;
	public Object=Object;
	public console=console;
	public stock=new GlobalVar.stockData();
	private getDefaultTableData=()=>{
		let returnVar:{[index:string]:any}={};
		let dbNameArr=Object.keys(GlobalVar.defaultColumnDefs);
		dbNameArr.map(pointer=>returnVar[pointer]=[]);
		console.log("defaultTableData = > ",returnVar);
		return returnVar;
	};
	public defaultTableData=this.getDefaultTableData();
	public user=new GlobalVar.user(
		localStorage.getItem('name'),
		localStorage.getItem('id'),
		Number(localStorage.getItem('dbKey')),
		localStorage.getItem('tableData') || JSON.stringify(this.defaultTableData),
		Number(localStorage.getItem('priviledge')),
		localStorage.getItem('isLogin'),
	);
	private localOptions=JSON.parse(localStorage.getItem('options')||'{}');
	private localTableOptions=
		this.localOptions.tableOptions?
		{tableOptions:this.localOptions.tableOptions}
		:
		{tableOptions:GlobalVar.defaultColumnDefs};
	private localActiveViewOptions=
		this.localOptions.activeView?
		{activeView:this.localOptions.activeView}
		:
		{activeView:Object.keys(this.stock.daftar)[0]};
	private corsConfig=
		this.localOptions.corsConfig?
		{corsConfig:this.localOptions.corsConfig}
		:
		{corsConfig:GlobalVar.config.defaultValue.cors};
	public options=new GlobalVar.options(Object.assign(this.localTableOptions,Object.assign(this.localActiveViewOptions,this.corsConfig)));
	public activeView:any="";
	private fb : FormBuilder = inject(FormBuilder);
	public navigationPages:any;
	public debugThis:any='';
	public lastRequest:any;
	public temp:any=[];
	public defaultFIlterParam:{[index:string]:any}={};
	public operation:any={
		mode:{
			view:{
				gridOptions:{
					onRowDoubleClicked:(event:any)=>{
						if(this.activeView==='stock'){
							let index=this.user.tableData.stock[this.user.dbKey].findIndex((item:any)=>event.data.ID_DAFTAR===item.ID_DAFTAR)
							let modalData=this.user.tableData.stock[this.user.dbKey][index];
							this.modal.modal_1.openModal(modalData);
						};
						if(this.activeView==='transaksi'){
							//alert(GlobalVar.alert();
							let temp=Object.assign(event.data,{STOCK:this.gridOptions.rowData.filter((x:any)=>x.ID_DAFTAR===event.data.ID_DAFTAR).reduce((a:any,b:any)=>a+b.JUMLAH,0)});
							alert(GlobalVar.alert(temp));
							//this.modal.modal_5.openModal(temp)
						};
					},
				},
			},
			edit:{
				gridOptions:{
					onRowDoubleClicked:(data:any)=>{
						let activeView=this.activeView;
						//console.log("data",data);
						let parentId=data.data.ID_DAFTAR;		
						if(activeView==='stock')return this.modal.modal_4.openModal(parentId);
					},
				},
			},
			delete:{
				gridOptions:{
					onRowDoubleClicked:(event:any)=>{
						let activeView=this.activeView;
						console.log(event.data);
						if(activeView==='stock')return this.delete([event.data],'daftar');
						//if(activeView==='transaksi')return this.delete(event.data,activeView);
						return
					},
				},
				selectedData:null,
				deleteFunction:(data:any)=>{
					let activeView=this.activeView;
					if(activeView==='stock')return this.delete(data,'daftar');
					//if(activeView==='transaksi')return this.delete(data,activeView);
					return
				},
			},
		},
		active:'view',
		changeOperation:(name:string)=>{
			this.operation.active=name
		},
		updateGridOptions:()=>{
			console.log('updateGridOptions , gridOptions');
		},
	};
	constructor(){
			this.navigationPages=GlobalVar.pages;
			this.operation.active=Object.keys(this.operation.mode)[0];
			let defaultActiveViewValue='stock';
			if(defaultActiveViewValue){
				this.activeView=defaultActiveViewValue;
			}else{
				this.activeView=this.options.data.activeView
					||
					this.options.setOptions(this.activeView,"activeView");
			};
			let localDefaultFilterObj=this.localOptions.filterParams;
			this.misc.setFilterParams(
				localDefaultFilterObj?
				localDefaultFilterObj:
				this.misc.getDefaultFilterObj()
			);
			this.globalService.setHeaders("user",this.user.name);
	};
	
	ngOnInit(){
		let switchFallbackFunct=()=>{
			console.log('SWITCH_EXCEPTION_ERROR')
			this.refreshPage(this.activeView);
		};
		this.socket.on("connect", () => {
			this.misc.loadingWrapper(
				()=>{
					console.log("socket connected, socket : ");
					let clientData={
						name:this.user.name,
						userId:this.user.id,
						dbKey:this.user.getDbKey(),
					};
					this.socket.emit("login",clientData,(response:any)=>{
						let tableData=this.user.getTableData(this.activeView);
						console.log("tableDataNull?"+"=>",tableData);
						if(!!response.success&&!!tableData){
							//console.log("LOGIN SUCCESS = > ",response);
							this.updateData(tableData,this.activeView);
						}else{
							//console.log("LOGIN FAILED = > ",response);
							//console.log("response.dbKey",response.dbKey)
							this.refreshPage(this.activeView);
						};
					});
				},this.gridOptions
			);
		});
		this.socket.on("init",(emittedData:any)=>{
			console.log("EMIT RECEIVED: init");
			let message=emittedData.message;
			alert(message);
			this.refreshPage(this.activeView);
		});
		this.socket.on("login", () => {
			//console.log("socket connected, socket : ");
			this.misc.loadingWrapper(
				()=>{
					console.log("EMIT RECEIVED: LOGIN");
					let clientData={
						name:this.user.name,
						userId:this.user.id,
						dbKey:this.user.getDbKey(),
					};
					this.socket.emit("login",clientData,(response:any)=>{
						if(!!response.success&&!!this.user.getTableData(this.activeView)){
							console.log("LOGIN SUCCESS = > ",response);
							this.updateData(this.user.getTableData(this.activeView),this.activeView);
						}else{
							console.log("LOGIN FAILED = > ",response);
							console.log("response.dbKey",response.dbKey)
							this.refreshPage(this.activeView);
						};
					});
				},this.gridOptions
			);
		});
		this.socket.on("delete",(emittedData:any)=>{
			this.misc.loadingWrapper(
				()=>{
					console.log("EMIT RECEIVED: DELETE =>",emittedData);
					console.log("AT =>",this.activeView);
					let message=emittedData.message;
					let deletedDataId=emittedData.deletedDataId;	
					let oldData=this.user.getTableData(this.activeView);
					let alertArr:Array<any>=[];
					let deletedData=oldData.filter((item:any)=>deletedDataId.includes(item.ID_DAFTAR));
					deletedData.map((item:any)=>{
						alertArr.push({
							id:item.ID_DAFTAR,
							Nama:item.NAMA,
							Supplier:item.SUPPLIER,
						});
					});
					console.log(
						"this.user.setTableData(emittedData.dbKey,this.user.deleteById(deletedDataId,this.activeView),this.activeView",
						this.user.setTableData(emittedData.dbKey,this.user.deleteById(deletedDataId,this.activeView),this.activeView)
						);
					this.setDbKey(emittedData.dbKey);
					this.updateData(this.user.getTableData(this.activeView),this.activeView);
					alert(GlobalVar.alert(alertArr,message));
				},this.gridOptions
			);
		});
		this.socket.on("get",(emittedData:any)=>{
			alert('get emit');
			console.log("emittedData : ",emittedData);
		});
		this.socket.on("put",(emittedData:any)=>{
			this.misc.loadingWrapper(
				()=>{
					console.log("EMIT RECEIVED: PUT =>",emittedData);
					let data=emittedData.data;
					let message=emittedData.message;
					let dbKey=emittedData.dbKey;
					let alertArr:Array<any>=[];
					switch(this.activeView){
						case 'stock':
							let oldData=this.user.getTableData(this.activeView);
							data.map((item:any)=>{
								alertArr.push({
									id:item.ID_DAFTAR,
									Nama:item.NAMA,
									Supplier:item.SUPPLIER,
								});
							});
							data.map((item:any)=>{
								
								let id=oldData.findIndex((x:any)=>x.ID_DAFTAR===item.ID_DAFTAR);
								console.log("id",id)
								console.log("before",oldData[id],oldData)
								oldData[id]=item;
								console.log("after",oldData[id],oldData)
							});
							let newAndUpdatedData=oldData;
							this.setDbKey(dbKey);
							this.user.setTableData(dbKey,newAndUpdatedData,this.activeView);
							this.updateData(this.user.getTableData(this.activeView),this.activeView);
							alert(GlobalVar.alert(alertArr,message));
							break;
						default:
							switchFallbackFunct();
					};
				},this.gridOptions
			);
		});
		this.socket.on("post",(emittedData:any)=>{
			this.misc.loadingWrapper(
				()=>{
					console.log("EMIT RECEIVED: POST =>",emittedData);
					let data=emittedData.data;
					let message=emittedData.message;
					let dbKey=emittedData.dbKey;
					let alertArr:Array<any>=[];
					switch(this.activeView){
						case 'stock':
							console.log("stock switch =>" );
							let oldData=this.user.getTableData(this.activeView);
							data.map((item:any)=>{
								alertArr.push({
									id:item.ID_DAFTAR,
									Nama:item.NAMA,
									Supplier:item.SUPPLIER,
								});
							});
							let newAndUpdatedData=oldData;
							newAndUpdatedData.push(...data);
							this.setDbKey(dbKey);
							this.user.setTableData(dbKey,newAndUpdatedData,this.activeView);
							this.updateData(this.user.getTableData(this.activeView),this.activeView);
							alert(GlobalVar.alert(alertArr,message));
							break;
						default:
							console.log("stock exception =>" );
							switchFallbackFunct();
					};
				},this.gridOptions	
			);
		});
		this.socket.on("transaksi",(emittedData:any)=>{
			this.misc.loadingWrapper(
				()=>{
					console.log("EMIT RECEIVED: TRANSAKSI =>",emittedData);
					console.log("this.user.getTableData('transaksi')",this.user.getTableData('transaksi'));
					let data=emittedData.data;
					let message=emittedData.message;
					let dbKey=emittedData.dbKey;
					let alertArr:Array<any>=[];
					switch(this.activeView){
						case 'stock':			
							let oldDataTransaksi=this.user.getTableData('transaksi')||[];
							let oldDataStock=this.user.getTableData('stock')||[];
							this.setDbKey(dbKey);
							if(oldDataTransaksi.length>0){
								data.map((item:any)=>{
									console.log("convertDate(ITEM.TANGGAL) = ",item.TANGGAL=this.misc.convertDate(item.TANGGAL));
									oldDataTransaksi.push(item);
								});
								this.user.setTableData(dbKey,oldDataTransaksi,'transaksi');
							};
							if(oldDataStock.length>0){
								let newAndUpdatedData=this.misc.copy(oldDataStock);
								data.map((item:any)=>{
									let updatedDataIndex=oldDataStock.findIndex((item2:any)=>item2.ID_DAFTAR===item.ID_DAFTAR);
									newAndUpdatedData[updatedDataIndex].STOCK+=item.JUMLAH;
									alertArr.push({
										id:newAndUpdatedData[updatedDataIndex].ID_DAFTAR,
										Nama:newAndUpdatedData[updatedDataIndex].NAMA,
										Supplier:newAndUpdatedData[updatedDataIndex].SUPPLIER,
										"Stock Awal":oldDataStock[updatedDataIndex].STOCK,
										"Stock Akhir":newAndUpdatedData[updatedDataIndex].STOCK,
										"Perubahan Stock":newAndUpdatedData[updatedDataIndex].STOCK-oldDataStock[updatedDataIndex].STOCK,
									});
								});
								this.user.setTableData(dbKey,newAndUpdatedData,'stock');
							};
							this.updateData(this.user.getTableData(this.activeView),this.activeView);
							alert(GlobalVar.alert(alertArr,message));
							break;
						default:
							switchFallbackFunct();
					};
				},this.gridOptions
			);	
		});
		this.socket.on("deleteTransaksi",(emittedData:any)=>{
			/*
			console.log("EMIT RECEIVED: deleteTransaksi =>",emittedData);
			let key="transaksi";
			let oldData=this.user.getTableData();
			let data=emittedData.data;
			let message=emittedData.message;
			let dbKey=emittedData.dbKey;
			let alertArr:Array<any>=[];
			let deletedDataId=data.map((x:any)=>x.ID_TRANSAKSI);
			
			console.log("oldData",oldData);
			console.log("deletedDataId",deletedDataId);
			console.log("===>",
				oldData.transaksi.filter((item2:any)=>deletedDataId.includes(item2.ID_TRANSAKSI)))
			
			if(oldData.length<1){
				
				
			}else{

			};
			*/
		});
		this.debugThis=this;
	};
	/// APIURL ///
	public apiUrl={
		value:this.options.data.corsConfig.url,
		inputValue:"",
		eventHandler:(event:any)=>this.apiUrl.inputValue=event.target.value,
		flush:()=>this.apiUrl.inputValue="",
		set:(event:any)=>{
			if (!this.apiUrl.inputValue||this.apiUrl.inputValue===this.apiUrl.value)return alert ("error")
			let temp=this.options.data.corsConfig;
			temp.url=this.apiUrl.inputValue;
			this.options.setOptions(temp,'corsConfig');
			
			alert("Success, Api Url = "+this.apiUrl.inputValue);
			window.location.reload()
			
		},
	};
	/// \APIURL ///
	
	/// QUICKEDIT ///
	public quickEdit=new class quickEdit{
		isActive:boolean;
		constructor(){
			this.isActive=false;
		};
		toggleIsActive=()=>{
			return this.isActive=!this.isActive;
		};
	}();
	/// \QUICKEDIT ///

	/// OFFCANVAS ///
	private offcanvasService:NgbOffcanvas=inject(NgbOffcanvas);
	private offCanvasInstance:any;
	public _offCanvas={
		open:(content:any)=>this.offCanvasInstance=this.offcanvasService.open(content),
	};
	/// \OFFCANVAS ///
	
	/// MODAL ///
	public modalService:NgbModal=inject(NgbModal);
	@ViewChild('modal_1') modal_1!:DynamicModalComponent;//modal stock
	@ViewChild('modal_2') modal_2!:DynamicModalComponent;//modal transaksi
	@ViewChild('modal_3') modal_3!:DynamicModalComponent;//modal add stock
	@ViewChild('modal_4') modal_4!:DynamicModalComponent;//modal edit stock
	@ViewChild('modal_5') modal_5!:DynamicModalComponent;//modal detail transaksi
	public activeModal:string='';
	public modal:any={
		modal_1:{
			openModal:(modalData:any)=>{
				this.modal.modal_1.data=modalData;
				this.modal.modal_1.modalRef=this.modalService.open(this.modal_1);
			},
			isLoading:false,
			updateTransactionData:(modalData:any)=>{
				this.globalService.getData('transaksi',[modalData.ID_DAFTAR]).subscribe(
					(x:any)=>{
						x.data.map((item:any)=>{
							item.TANGGAL=this.misc.convertDate(item.TANGGAL);
						});
						this.modal.modal_1.grid.gridOptions.api.setRowData(x.data);
						this.modal.modal_1.grid.gridOptions.api?.setColumnDefs(
							this.modal.modal_1.grid.columnDefs.map(
								(item:any)=>Object.assign(item,this.modal.modal_1.grid.defaultColumnDefs)
							)
						);
					}
				);
			},
			grid:{
				gridOptions:{
					pagination: false,
					//paginationPageSize:5,	
					paginationAutoPageSize:false,
					accentedSort:true,
					onGridReady:(params:any)=>{
						console.log("grid Event => onGridReady : ");
						let modalData=this.modal.modal_1.data;
						this.globalService.getData('transaksi',[modalData.ID_DAFTAR]).subscribe(
							(x:any)=>{
								x.data.map((item:any)=>{
									item.TANGGAL=this.misc.convertDate(item.TANGGAL);
								});
								this.modal.modal_1.grid.gridOptions.api.setRowData(x.data);
								this.modal.modal_1.grid.gridOptions.api.setColumnDefs(
									this.modal.modal_1.grid.columnDefs.map(
										(item:any)=>
											Object.assign(item,this.modal.modal_1.grid.defaultColumnDefs)
									)
								);
								this.modal.modal_1.grid.gridOptions.columnApi.autoSizeAllColumns();
							}
						);
					},
					onModelUpdated: (event:any)=>{
						console.log("grid Event => onModelUpdated : ");
					},
					onRowDataUpdated:(event:any)=>{
						console.log("grid Event => onRowDataUpdated : ");
						
					},
					onFirstDataRendered:(event:any)=>{
						console.log("grid Event => onFirstDataRendered : ");
					},
					onColumnVisible:(event:any)=>{
						console.log("grid Event => onColumnVisible : ");
					},
					onViewportChanged:(evet:any)=>{
						console.log("grid Event => onviewportChanged : ");
					},
				},
				defaultColumnDefs:{
					resizable:false,
					sortable: true,
					filter: false,
					editable:false,
				},
				columnDefs:[
					{
						field:'ID_TRANSAKSI',
						headerName:'Id',
						hide:true,
					},
					{
						field:'JUMLAH',
						headerName:'Jumlah',
					},
					{
						field:'TANGGAL',
						headerName:'Tanggal',
						sort: "desc",
						autoHeight: true,
						comparator:GlobalVar.agGridLocaleDateComparator,
					},	
					{
						field:'USER',
						headerName:'User',
					},		
					{
						field:'JENIS',
						headerName:'Jenis',
					},
					{
						field:'KETERANGAN',
						headerName:'Keterangan',
					},			
					{
						field:'ID_DAFTAR',
						hide:true,
					},
					{
						field:'SUPPLIER',
						hide:true,
					},
					{
						field:'JENIS',
						hide:true,
					},
					{
						field:'NAMA',
						hide:true,
					},
					{
						field:'KATEGORI',
						hide:true,
					},
				],
			},
			closeModal:()=>{
				this.modal.modal_1.modalRef.close();
			},
			transactionData:[],
			getTransactionData:(id:Array<number>)=>{
				return ;
			},
			deleteFunct:(data:any)=>{
				this.delete([data],'stock');
				this.modal.modal_1.closeModal();
			},
			data:{},
			modalRef:undefined,
			innerTable:{
				defaultColumnDefs:{
					ID_TRANSAKSI:{
						headerName:'Id',
					},
					JUMLAH:{
						headerName:'Jumlah',
					},
					JENIS:{
						headerName:'Jenis',
					},
					TANGGAL:{
						headerName:'Tanggal',
						callback:(x:any)=>new Date(x).toLocaleString('id'),
					},
					KETERANGAN:{
						headerName:'Keterangan',
					},
					USER:{
						headerName:'User',
					},
					NAMA:{
						hidden:true,
					},
					KATEGORI:{
						hidden:true,
					},
					SUPPLIER:{
						hidden:true,
					},	
					ID_DAFTAR:{
						hidden:true,
					},							
					
				},
			},
		},
		modal_2:{
			openModal:(modalData:any)=>{
				
				this.modal.modal_2.data=modalData;
				this.modal.modal_2.form=this.fb.group({
					id:modalData.ID_DAFTAR,
					update:[0,[Validators.required,StockValidators.update]],
					final:[modalData.STOCK,[Validators.required,StockValidators.final]],
					jenis:["-"],
					keterangan:["-"],
				});
				let form=this.modal.modal_2.form;
				let formUpdateValue=form.get("update");
				let formFinalValue=form.get("final");
				let formJenisValue=form.get("jenis");
				//formJenisValue.disable();
				console.log("formUpdateValue",formUpdateValue)
				let alreadyOnce:boolean=false;
				this.modal.modal_2.isInteracted=false
				let f_1=(x:any)=>{
					console.log("X   =  >   ",x)
					//if(!(x>0) && !(x<0)) return formJenisValue.setValue("-");
					if(x<0) return formJenisValue.setValue("KELUAR");
					if(x>0) return formJenisValue.setValue("MASUK");
					if(x===null || x===0) return console.log("NULL");
					return formJenisValue.setValue("-");
				};
				
				formUpdateValue.valueChanges.subscribe((x:number)=>{
					if(alreadyOnce){alreadyOnce=false}
					else{
						alreadyOnce=true;
						this.modal.modal_2.isInteracted=true
						let temp=modalData.STOCK+x
						formFinalValue.setValue(temp);
						console.log("x",x);
						console.log("typeof X",typeof(x));
						console.log("STOCK",temp);
						console.log("typeof STOOCK",typeof(modalData.STOCK));
						console.log('Valid?', this.modal.modal_2.isValid('update'));
						f_1(formUpdateValue.value);
					}
				})
				formFinalValue.valueChanges.subscribe((x:number)=>{
					if(alreadyOnce){alreadyOnce=false}
					else{
						alreadyOnce=true;
						this.modal.modal_2.isInteracted=true
						let temp;
						if (x!==null){
							temp = x-(modalData.STOCK);
							formUpdateValue.setValue(temp);
						}else formUpdateValue.setValue("-")
						console.log("x",x);
						console.log("typeof X",typeof(x));
						console.log("STOCK",temp);
						console.log("typeof STOOCK",typeof(modalData.STOCK));
						console.log('Valid?', this.modal.modal_2.isValid('final'));
						f_1(formUpdateValue.value);
					}
				})
				this.modal.modal_2.modalRef=this.modalService.open(this.modal_2);
				console.log("isInteracted",this.modal.modal_2.isInteracted)
				console.log("modal.modal_2.form.get('update').valid",
					this.modal.modal_2.form.get('update').valid)
			},
			closeModal:()=>{
				this.modal.modal_2.modalRef.close();
			},
			isInteracted:false,
			isValid:(formName:string)=>{
				console.log("formn Name ="+formName, this.modal.modal_2.form.get(formName).valid);
				if(this.modal.modal_2.isInteracted)
				{
					return this.modal.modal_2.form.get(formName).valid;
				}
				return false
			},
			data:{},
			defaultData:{},
			form:{},
			modalRef:undefined,
			newTransactionSubmit:()=>{
				let data={
					ID_DAFTAR:this.modal.modal_2.form.value.id,
					JUMLAH:this.modal.modal_2.form.value.update,
					JENIS:this.modal.modal_2.form.value.jenis,
					KETERANGAN:this.modal.modal_2.form.value.keterangan,
				};
				//this.postEmbed(this.activeView,data,"transaksi",data._id);
				this.globalService.postData("transaksi",[data]).subscribe(x=>{

				});
				this.modal.modal_2.closeModal();
				this.modal.modal_1.closeModal();
			},
		},modal_3:{
			openModal:()=>{
				this.modal.modal_3.modalRef=this.modalService.open(this.modal_3);
				this.modal.modal_3.isReadyToSubmit=true;
				this.modal.modal_3.form=this.fb.group({
					formNama:["",[GlobalValidator.required]],
					formSupplier:["",[GlobalValidator.required]],
					formQty:[0,[GlobalValidator.number,GlobalValidator.required,GlobalValidator.cantBeZero]],
					formStn:["",[GlobalValidator.required,GlobalValidator.string]],
					formKategori:["",[GlobalValidator.required]],
					formCtn:[0,[GlobalValidator.number,GlobalValidator.required]],
				},{});
				let form=this.modal.modal_3.form;
				let formNamaValue=form.get("formNama");
				let formSupplierValue=form.get("formSupplier");
				let formQtyValue=form.get("formQty");
				let formStnValue=form.get("formStn");
				let formKategoriValue=form.get("formKategori");
				let formCtnValue=form.get("formCtn");
				
				formNamaValue.valueChanges.subscribe((x:string)=>console.log(x))
				formSupplierValue.valueChanges.subscribe((x:string)=>console.log(x))
				formQtyValue.valueChanges.subscribe((x:number)=>{
					console.log(this.modal.modal_3.form.controls.formQty);
				});
				formStnValue.valueChanges.subscribe((x:string)=>console.log(x))
				formKategoriValue.valueChanges.subscribe((x:string)=>console.log(x))
				formCtnValue.valueChanges.subscribe((x:number)=>console.log(x))
				this.activeModal='modal_3';
				
			},
			isReadyToSubmit:true,
			closeModal:()=>{
				this.modal.modal_3.modalRef.close();
				this.activeModal='';
			},
			data:{},
			form:{},
			submit:()=>{
				if(this.modal.modal_3.isReadyToSubmit===false)return console.log("IS_NOT_READY_EXCEPTION ")
				this.modal.modal_3.isReadyToSubmit=false;
				//this.gridOptions.rowData=null;
				let form=this.modal.modal_3.form;
				form.markAllAsTouched()
				form.updateValueAndValidity()
				if(!!form.valid){
					console.log('FORM IS VALID ');
					console.log('form = >',form);
					let reqVar={
						NAMA:form.value.formNama,
						SUPPLIER:form.value.formSupplier,
						QTY:form.value.formQty,
						STN:form.value.formStn,
						KATEGORI:form.value.formKategori,
						CTN:form.value.formCtn,
					};
					this.globalService.postData(
							'stock',
							[reqVar]
						).subscribe((x:any)=>{
							if(!!x.body?.success){
								this.modal.modal_3.closeModal();
								if(!!this.offCanvasInstance)this.offCanvasInstance.close();
							}else{
								this.modal.modal_3.isReadyToSubmit=true;
								return alert(x);
							};
					});
				}else return
			},
			modalRef:undefined,
			getStnFilterData:()=>{
				if(this.stock.daftar.stock.filterData['Qty/ Ctn']===undefined)return [];
				return [...new Set(this.stock.daftar.stock.filterData['Qty/ Ctn'].map((item:any)=>item.split(' ')[1]))];
			},
			getDatalist:(pointer:string)=>{
				if(this.stock.daftar.stock.filterData[pointer]===undefined)return [];
				return this.stock.daftar.stock.filterData[pointer];
			},
		},
		modal_4:{
			openModal:(parentData:any)=>{
				//console.log(this.modal.modal_4)
				this.modal.modal_4.modalRef=this.modalService.open(this.modal_4);
				this.modal.modal_4.isReadyToSubmit=true;
				let tableData=this.user.getTableData('stock');
				parentData=tableData.find((item:any)=>item.ID_DAFTAR===parentData.ID_DAFTAR);
				this.modal.modal_4.initialData=parentData;
				if(!!this.modal.modal_4.initialData.STOCK)delete(this.modal.modal_4.initialData.STOCK);
				let initialData=parentData;
				console.log("initialData",initialData);
				this.modal.modal_4.form=this.fb.group({
					form_id:[initialData.ID_DAFTAR],
					formNama:[initialData.NAMA,[GlobalValidator.required]],
					formSupplier:[initialData.SUPPLIER,[GlobalValidator.required]],
					formQty:[initialData.QTY,[GlobalValidator.number,GlobalValidator.required,GlobalValidator.cantBeZero]],
					formStn:[initialData.STN,[GlobalValidator.required,GlobalValidator.string]],
					formJenis:[initialData.JENIS,[GlobalValidator.required,GlobalValidator.string]],
					formKode:[initialData.KODE,[GlobalValidator.required]],
					formKategori:[initialData.KATEGORI,[GlobalValidator.required]],
				},{});
				//console.log("parentId",parentId);
				//console.log("tableData",tableData);
				//console.log("parentData",parentData);
				let form=this.modal.modal_4.form;
				let formNamaValue=form.get("formNama");
				let formSupplierValue=form.get("formSupplier");
				let formQtyValue=form.get("formQty");
				let formStnValue=form.get("formStn");
				let formKategoriValue=form.get("formKategori");
				let formJenisValue=form.get("formJenis");
				let formKodeValue=form.get("formKode");
				this.activeModal='modal_4';
				
			},
			closeModal:()=>{
				this.modal.modal_4.modalRef.close();
				this.activeModal='';
			},
			initialData:{},
			isReadyToSubmit:true,
			data:{},
			form:{},
			resetForm:(initialData?:any|undefined)=>{
				try{
					if(!initialData)initialData=this.modal.modal_4.initialData;
					let form=this.modal.modal_4.form;
					form.get("formNama").setValue(initialData.NAMA);
					form.get("formSupplier").setValue(initialData.SUPPLIER);
					form.get("formQty").setValue(initialData.QTY);
					form.get("formStn").setValue(initialData.STN);
					form.get("formKategori").setValue(initialData.KATEGORI);
					form.get("formJenisi").setValue(initialData.JENIS);
					form.get("formKode").setValue(initialData.KODE);
					return 
				}catch(e){
					alert('err')
					return
				}
			},
			submit:()=>{
				if(this.modal.modal_4.isReadyToSubmit===false)return console.log("IS_NOT_READY_EXCEPTION ")
				this.modal.modal_4.isReadyToSubmit=false;
				let form=this.modal.modal_4.form;
				let initialData=this.modal.modal_4.initialData;
				//initialData
				form.markAllAsTouched()
				form.updateValueAndValidity()
				if(!!form.valid){
					console.log('FORM IS VALID ');
					console.log('form = >',form);
					let reqVar={
						ID_DAFTAR:form.value.form_id,
						NAMA:form.value.formNama,
						SUPPLIER:form.value.formSupplier,
						QTY:form.value.formQty,
						STN:form.value.formStn,
						KATEGORI:form.value.formKategori,
					};
					console.log('initialData ',this.modal.modal_4.initialData);
					console.log('reqVar =',reqVar);
					if(JSON.stringify(initialData)===JSON.stringify(reqVar)){
						alert("Data Tidak Berubah");
						this.modal.modal_4.isReadyToSubmit=true;
					}else
					this.globalService.putData('stock',[reqVar]).subscribe(x=>{
						console.log("MODAL_4 => ",x);
						//this.modal.modal_1.closeModal();
						this.modal.modal_4.closeModal();
					});
				}else this.modal.modal_4.isReadyToSubmit=true;
			},
			modalRef:undefined,
			getStnFilterData:()=>{
				
				if(this.stock.daftar.stock.filterData['Qty/ Ctn']===undefined)return [];
				return [...new Set(this.stock.daftar.stock.filterData['Qty/ Ctn'].map((item:any)=>item.split(' ')[1]))];
			},
			getJenisFilterData:()=>{
				if(this.stock.daftar.stock.filterData['Jenis']===undefined)return [];
				return [...new Set(this.stock.daftar.stock.filterData['Jenis'].map((item:any)=>item.split(' ')[1]))];
			},
			getDatalist:(pointer:string)=>this.stock.daftar.stock.filterData[pointer.toUpperCase()],
		},
		modal_5:{
			openModal:(detailData:any)=>{
				this.activeModal='modal_5';
				this.modal.modal_5.modalRef=this.modalService.open(this.modal_5);
				this.modal.modal_5.data=detailData
			},
			closeModal:()=>{
				this.modal.modal_5.modalRef.close();
				this.activeModal='';				
			},
			data:{},
			deleteFunct:()=>{
				let temp=this.modal.modal_5.data;
				console.log("data to delete",temp);
				this.globalService.deleteData("transaksi",[temp.ID_TRANSAKSI]).subscribe(x=>{
					console.log(x);
				})
			},
			submit:()=>{},
			modalRef:undefined,
		},
	};
	get formNama() { return this.modal[this.activeModal].form.get('formNama'); }
	get formSupplier() { return this.modal[this.activeModal].form.get('formSupplier'); }
	get formQty() { return this.modal[this.activeModal].form.get('formQty'); }
	get formStn() { return this.modal[this.activeModal].form.get('formStn'); }
	get formKategori() { return this.modal[this.activeModal].form.get('formKategori'); }
	get formJenis() { return this.modal[this.activeModal].form.get('formJenis'); }
	get formKode() { return this.modal[this.activeModal].form.get('formKode'); }
	get formCtn() { return this.modal[this.activeModal].form.get('formCtn'); }
	/// \MODAL ///
	
	/// EXCEL ///
	public _excel={
		postExcel:(dbName:string,data:any)=>{
			this.gridOptions.api?.showLoadingOverlay();
			this.globalService.excelHandler(data).then(x=>{
				let url=new URL (dbName+"/excelupload",this.options.data.corsConfig.url);
				this.globalService.postExcel(url.toString(),x).subscribe(y=>{
					console.log(y)
					console.log(y.status)
				})
			});		
		},
		downloadExcel:this.globalService.downloadExcel,
	};
	/// \EXCEL ///
	
	/// AG-GRID ///
	public defaultColDef: ColDef = {
		resizable:true,
		sortable: true,
		filter: true,
		editable:this.quickEdit.isActive,
		suppressMenu: true,
		suppressMovable:true,
		//wrapText: true,
		autoHeight: true,  
		getQuickFilterText: function(params) {
			return params.colDef.hide ? '' : 
				params.colDef.field!='NAMA' ? '' : params.value; 
		},
	};
	public getAllAgGridRows=()=>{
		this.gridOptions.api.selectAll();
		let returnVar=this.gridOptions.api.getSelectedRows();
		this.gridOptions.api.deselectAll;
		return returnVar
	};
	public filter:any={
		getCurrentFilter:()=>this.gridOptions.api.getFilterModel(),
		getDefaultFilterParams:()=>{
			let returnedVar:any={};
			Object.entries(GlobalVar.defaultColumnDefs).map((item:any)=>{
				let pointer=item[0];
				let data=item[1].defaultFilterParams;
				returnedVar[pointer]=data;
				console.log("returnedVar[pointer]=data;",returnedVar[pointer]=data)
			});
			console.log("returnedVar",returnedVar);
			return returnedVar;
		},
		setDefaultFilter:(colName:string)=>{
			let defaultFilterParams=this.misc.copy(this.filter.getDefaultFilterParams());
			console.log("this.filter.getDefaultFilterParams();",defaultFilterParams);
			this.misc.setFilterParams(defaultFilterParams);
			this.gridOptions.api.setFilterModel(defaultFilterParams[this.activeView]);
			//this.gridOptions.api.onFilterChanged();
		},
		setFilter:(header:any,filter:any,filterType?:string,type?:string)=>{
			console.log("getCurrentFilter().STOCK?.filter",this.filter.getCurrentFilter().STOCK?.filter);
			console.log('header',header);
			console.log('filter',filter);
			console.log('filterType',filterType);
			console.log('type',type);
			alert("Filter :"+`
				getCurrentFilter().STOCK?.filter : `+this.filter.getCurrentFilter().STOCK?.filter+`
				header : `+header+`
				filter : `+filter+`
				filterType : `+filterType+`
				type : `+type
			)
			let filterInstance = this.gridOptions.api.getFilterInstance(header); 
			let defaultFilterParams=this.misc.copy(this.filter.getDefaultFilterParams());
			let temp1:any={};
			temp1['filter']=filter;
			if(!filterType){
				if(filterInstance.filterType) return temp1['filterType']=filterInstance.filterType;
				temp1['filterType']=defaultFilterParams[this.activeView][header].filterType;
			} else {
				temp1['filterType']=filterType;
			};
			if(!type){
				if(filterInstance.type) return temp1['type']=filterInstance.type;
				temp1['type']=defaultFilterParams[this.activeView][header].type;
			} else {
				temp1['type']=type;
			};
			let filterParams=this.options.data.filterParams;
			console.log("FILTERPARAMS : ",filterParams);
			filterParams[this.activeView][header]=temp1;
			console.log("debug1",JSON.parse(JSON.stringify(filterParams[this.activeView][header])));
			console.log("debug2",temp1);
			console.log("filterInstance",filterInstance);
			this.misc.setFilterParams(filterParams);
			filterInstance.setModel(temp1);
			this.gridOptions.api.onFilterChanged();
		},
		searchTimeout:undefined,
		searchDelay:500,
		search:(event:any)=>{
			if(!!this.filter.searchTimeout)clearTimeout(this.filter.searchTimeout);
			this.filter.searchTimeout=setTimeout(()=>{
				this.gridOptions.api.setQuickFilter(event.target.value);
			},this.filter.searchDelay);	
		},
	};
	private gridTimeoutDelay:number=200;
	private gridTimeoutContainer:any={};
	public gridOptions:any= {
		rowData:null,
		suppressCellFocus:true,
		columnDefs:[],
		pagination: true,
		paginationAutoPageSize:false,	
		rowSelection: 'single',
		rowMultiSelectWithClick:!this.quickEdit.isActive,
		paginationPageSize:50,	
		accentedSort:true,
		onGridReady:(params:any)=>{
			console.log("grid Event => onGridReady : ");
			window.addEventListener('resize', (event)=>this.adjustTableContainerSize());
			
			//this.adjustTableContainerSize();
		},
		onFirstDataRendered:(event:any)=>{
			console.log("grid Event => onFirstDataRendered : ");
			console.log("onFirstDataRendered timeout start");

			//console.log("this.gridOptions.columnApi.getColumns()",this.gridOptions.columnApi.getColumns());

			/*
			if(!!this.gridTimeoutContainer)clearTimeout(this.gridTimeoutContainer);
			this.gridTimeoutContainer=setTimeout(async()=>{
				console.log("onFirstDataRendered timeout finish")
				//this.gridOptions.columnApi.autoSizeAllColumns();
				this.gridOptions.api.hideOverlay();
			},this.gridTimeoutDelay);
			*/
			//this.gridOptions.columnApi.autoSizeAllColumns();
		},
		onSelectionChanged:(event: any)=>{

		},
		onCellEditingStarted:(event:any)=>{

		},
		onCellEditingStopped:(event:any)=>{

		},
		onPaginationChanged:(params:any)=>{
			//console.log("grid Event => onPaginationChanged : ");
		},
		onRowDataUpdated:async(event:any)=>{
			console.log("grid Event => onRowDataUpdated : ");
			
		},
		onFilterChanged:(event:any)=>{
			//console.log("grid Event => onFilterChanged : ");
		},
		onColumnResized: (event:any) => {
			console.log("grid Event => onColumnResized : ");
			if(!!this.gridTimeoutContainer["onColumnResized"])clearTimeout(this.gridTimeoutContainer["onColumnResized"]);
			this.gridTimeoutContainer["onColumnResized"]=setTimeout(async()=>{
				console.log("onColumnResized timeout finish")
				if (event.source==="autosizeColumns"||event.source==="api")return this.adjustTableContainerSize();
				let temp=this.options.data.tableOptions;
				temp[this.activeView].columnDefs.find((item:any)=>item.field===event.column.userProvidedColDef.field).width=event.column.actualWidth;
				this.options.setOptions(temp,'tableOptions')
				this.adjustTableContainerSize();
			},this.gridTimeoutDelay);
		},
		onModelUpdated: (event:any)=>{
			//Displayed rows have changed. Triggered after sort, filter or tree expand / collapse events.
			console.log("grid Event => onModelUpdated : ",event);
			console.log("onModelUpdated timeout start")
			if(!!this.gridTimeoutContainer["onComponentStateChanged"])clearTimeout(this.gridTimeoutContainer["onComponentStateChanged"]);
			this.gridTimeoutContainer["onComponentStateChanged"]=setTimeout(async()=>{
				console.log("onComponentStateChanged, timeout finish")
				console.log("this.options.data.tableOptions",this.options.data.tableOptions)
				this.options.data.tableOptions[this.activeView].columnDefs.map((columnDef:any)=>{
					if(columnDef.width){
						//if(this.gridOptions.columnApi.getColumn(columnDef.field).actualWidth===columnDef.width) return console.log("skip")
						this.gridOptions.columnApi.setColumnWidth(columnDef.field,columnDef.width);
						console.log("columnDef.width applied",columnDef.field,columnDef.width);
					}else{
						let temp=this.options.data.tableOptions;
						this.gridOptions.columnApi.autoSizeColumn(columnDef.field);
						
						if(this.gridOptions.columnApi.getColumn(columnDef.field)?.actualWidth){
							
							let width=this.gridOptions.columnApi.getColumn(columnDef.field).actualWidth	
							console.log("actualWidth "+width+" "+JSON.stringify(this.user.tableData?.[this.activeView][this.user.dbKey]))
							temp[this.activeView].columnDefs.find((item:any)=>item.field===columnDef.field).width=width;
						};	
					};
				});
				this.gridOptions.api.hideOverlay();
			},this.gridTimeoutDelay);
		},
		onComponentStateChanged:(event:any)=>{
			console.log("grid Event => onComponentStateChanged : ");
			
		},
		onColumnVisible:(event:any)=>{
			console.log("grid Event => onColumnVisible : ",event);
			if(event.visible===false)return this.adjustTableContainerSize();
			let columnHeaderArr=event.columns.map((item:any)=>item.colId);
			columnHeaderArr.map((item:any)=>{
				this.gridOptions.columnApi.autoSizeColumn(item);
			});
			/*
			this.options.data.tableOptions[this.activeView].columnDefs.map((columnDef:any)=>{
				if(columnDef.width){
					this.gridOptions.columnApi.setColumnWidth(columnDef.field,columnDef.width);
					console.log("columnDef.width applied",columnDef.field,columnDef.width);
				}else{
					
				};
			});
			*/
		},
		onRowDoubleClicked:(event:any)=>{
			console.log("grid Event => onRowDoubleClicked : ");
			let callBack;
			if(!this.quickEdit.isActive){		
				callBack=this.modal.modal_1.openModal;
	
			}else{
				callBack=this.modal.modal_2.openModal;
			};
			let index=this.user.tableData.stock[this.user.dbKey].findIndex((item:any)=>event.data.ID_DAFTAR===item.ID_DAFTAR)
			let modalData=this.user.tableData.stock[this.user.dbKey][index];
			callBack(modalData);
		}
	};
	public gridApi:any;//initialize at gridOptions.onGridReady
	public tableContainerStyle:{width:string,height:string}={width:'auto',height:'0px'};
	public adjustTableContainerHeight=()=>{
	
	};
	public adjustTableContainerSize=()=>{
		console.log("dataTable event => this.adjustContainerSize()");
		let navbarHeight=document.getElementById("mainNavbar")?.clientHeight;
		if(navbarHeight===undefined)navbarHeight=0;
		////////////////////////////////////////////
		let container=document.getElementById("gridTable")!;
		let containerRect=container.getBoundingClientRect();
		let containerRectTop=containerRect.top;
		////////////////////////////////////////////
		let innerTable=document.querySelectorAll('[class="ag-theme-alpine"]')[0];
		let innerTableRect=innerTable?.getBoundingClientRect();
		let innerTableRectRight:number=0;;
		if(!!innerTableRect?.right)innerTableRectRight=innerTableRect.right;
		/////////////////////////////////////////////
		let scrollBar=document.querySelectorAll('[Class=ag-body-vertical-scroll-viewport]')[0];
		let scrollBarRect=scrollBar?.getBoundingClientRect();
		let scrollBarRectWidth=scrollBarRect?.width;
		//scrollBarRectWidth=0
		let horizontalScrolbarBuffer=10;
		let pinnedColumn=["STOCK",'NAMA'];
		//let pinnedColumnTotalWidth=this.misc.getPinnedColumnWidth(pinnedColumn);

		let allColumnWidth=this.gridOptions.columnApi.getColumns().map((item:any)=>{
			let temp=item.colDef;
			if(!!item.visible)return item.getActualWidth();
			return 0;
		}).reduce((a:number,b:number)=>a+b,0);
		let wrapper1=document.getElementById("wrapper1")?.clientHeight;
		console.log("allColumnWidth",allColumnWidth);
		//////////////////////////////////////////////
		if(!!innerTable){
			let innerTableWidth=innerTable.getBoundingClientRect().width;
			let windowWidth=window.innerWidth;
			let width="50%";
			let height:any="100%";
			if(allColumnWidth>=windowWidth){
				width=(windowWidth-20).toString()+'px';
			}else{
				if(allColumnWidth===0) width='100%'
				//else width=(innerTableRectRight+scrollBarRectWidth)+"px";
				else width=(allColumnWidth+scrollBarRectWidth+horizontalScrolbarBuffer).toString()+'px';
			};
			let tempHeight=(window.innerHeight-navbarHeight);		
			height=22*Math.floor(tempHeight/22);
			let temp={
				width:width,
				height:height+horizontalScrolbarBuffer+'px',
			};
			if(JSON.stringify(this.tableContainerStyle)===JSON.stringify(temp))return
			this.tableContainerStyle=temp;
			//console.log("height ",height);
			//console.log("22*Math.floor((height-navbarHeight)",Math.floor(((height-navbarHeight)/22)-1));
			console.log("navbarHeight => ",navbarHeight);
			console.log("tempHeight => ",tempHeight);
			console.log("window.innerHeight => ",window.innerHeight);
			console.log("aaa0",this.gridOptions.api.paginationSetPageSize(Math.floor(((height-navbarHeight)/22)-1)));
		};		
	};
	/// \AG-GRID ///
	
	/// userAuth ///
	public userAuth={
		formVisibility:false,
		//maxLength:16,
		isLogin:false,
		formData:{
			userName:"",
			password:"",
		},
		inputHandler:{
			userName:(event:any)=>{
				let value=event.target.value
				//let maxLength=this.userAuth.maxLength;
				//if(value.length>maxLength)return;
				return this.userAuth.formData.userName=value;
			},
			password:(event:any)=>{
				let value=event.target.value;
				//let maxLength=this.userAuth.maxLength;
				let hashCode=this.userAuth.hashCode;
				//if(value.length>maxLength)return;
				let result=hashCode(value);
				this.userAuth.formData.password=!!result?result.toString():"";
			},
		},
		login:()=>{
			let userName=this.userAuth.formData.userName;
			let password=this.userAuth.formData.password;
			if(userName.length<1)return alert("userName kosong");
			if(password.length<1)return alert("password kosong");
			console.log("submit placeholder");
			console.log("userName",userName);
			console.log("password",password);
			this.globalService.getUserAuth("users",{userName:userName,password:password}).subscribe((x:any)=>{
				//check
				if(x.auth===false)return alert("userName/password salah");
				//init
				let name=userName;
				let id=x.id;
				let priviledge=x.priviledge;
				//exec set user
				this.user.setName(name);
				this.user.setId(id);
				this.user.setPriviledge(priviledge);
				this.user.setLogin(true);
				//set header
				this.globalService.setHeaders("user",this.user.name);
				//cleanup
				this.userAuth.formVisibility=false;
				this.userAuth.isLogin=true;
				this.userAuth.formData.userName="";
				this.userAuth.formData.password="";
				return alert(userName+", id => "+id+", priviledge => "+priviledge);
			});
		},
		logout:()=>{
			//exec
			this.user.logout();
			//cleanup
			this.userAuth.isLogin=false;
		},
		hashCode:(str:string)=>{
			let hash = 0;
			for (let i = 0, len = str.length; i < len; i++) {
				let chr = str.charCodeAt(i);
				hash = (hash << 5) - hash + chr;
				hash |= 0;
			};
			return hash;
		},
	};
	/// \userAuth ///
	setDbKey=(dbKey:number)=>{
		let temp=this.user.setDbKey(dbKey);
		console.log("set db key ", temp);
		this.globalService.setHeaders("dbKey",temp.toString());
	};
	post=(data:Array<any>)=>{
		let temp=this.gridOptions.rowData;
		this.gridOptions.rowData=null;
		//this.globalService.postData(this.activeView,data).subscribe(x=>console.log("SUBSCRIBE",x));
		this.globalService.postData(this.activeView,data).subscribe(x=>{
			console.log("POST_NEXT => ",x);
			this.gridOptions.rowData=temp;
			return x;
		});
	};
	postEmbed=(dbName:string,data:any,embedName:string|undefined,id:string|undefined)=>{
		this.globalService.postEmbedData(dbName,data,embedName,id).subscribe(x=>console.log("do postEmbed, awaiting response..",dbName,data,embedName,id));
	};
	delete=(data:any,dbName:string)=>{
		if(!Array.isArray(data))throw new Error ('Expected Array');	
		let confirmed:boolean=false;
		let idArr:any;
		if(Array.isArray(data))idArr=data.map(item=>item.ID_DAFTAR);
		//if(!dbName)dbName=this.activeView;
		if(data.length===this.gridOptions.rowData.length){
			confirmed=confirm(GlobalVar.alert([],"Hapus Semua Data ?"));
		}else{
			confirmed=confirm(GlobalVar.alert(data,"Hapus Data ?"));
		};
		if(!!confirmed){
			this.misc.loadingWrapper(
				()=>{
					this.globalService.deleteData(dbName,idArr).subscribe({
						next:(x)=>{
							console.log("DELETE_NEXT");
						},
						complete:()=>{
							console.log("DELETE_COMPLETE");
						},
						error:(e) => {
							alert(GlobalVar.alert([{name:e.name},{message:e.message}],e.statusText));
						},
					});
				},this.gridOptions
			);
		};
	};
	public misc={
		reset:()=>{
			localStorage.clear();
			location.reload();
		},
		copy:(x:any)=>JSON.parse(JSON.stringify(x)),
		showHiddenColumn:(columnName:string,value:boolean)=>{
			//console.log("columnName",columnName);
			//console.log("value",value);
			let tableOptions=this.options.data.tableOptions;
			//console.log(tableOptions);
			tableOptions[this.activeView].columnDefs.find((item:any)=>item.field===columnName).hide=value;
			//console.log('tableOptions',tableOptions);
			this.options.setOptions(tableOptions,'tableOptions');
		},
		toUpperCase:(x:string)=>{
			let temp="";
			if(!x)return "";
			temp=x.toUpperCase();
			return temp;
		},
		prompt:(text:string)=>{
			//if(this.user.prompt)true
		},
		loadingWrapper:async(_f:any,gridOptions:any,_var?:any)=>{
			this.gridOptions.api.showLoadingOverlay();
			return await _f();
		},
		closeAllModals:()=>console.log(this.offcanvasService),
		convertDate:(dateString:string)=>{
			let temp=new Date(dateString).toLocaleString('id');
			return temp;
		},
		checkAdm:()=>{
			return !!GlobalVar.config.adm.find(item=>item===this.user.name);
		},
		setFilterParams:(filterObj:any)=>{
			console.log("setFilterParams:(filterObj)",filterObj)
			Object.keys(filterObj).map(pointer=>{
			});
			this.options.setOptions(filterObj,"filterParams");
			console.log("options.filterParams",this.options.data.filterParams);
		},
		getDefaultFilterObj:()=>{
			let returnedVar:any={};
			Object.entries(GlobalVar.defaultColumnDefs).map((item:any)=>{
				let pointer=item[0];
				let data=item[1].defaultFilterParams;
				returnedVar[pointer]=data;
				console.log("returnedVar[pointer]=data;",returnedVar[pointer]=data)
			})
			return returnedVar;
		},
		getPinnedColumnWidth:(colArrStr:Array<any>)=>{
			let width=0;
			colArrStr.map(item=>{
				width+=this.gridOptions.columnApi.getColumn(item).getActualWidth()|0;
			});
			return width;
		},
		testAlert:(text:string)=>alert(text),
	};
	public setView=(viewName:string)=>{
		this.misc.loadingWrapper(
			()=>{
				console.log("SET_VIEW => ",viewName,this.options.setOptions(viewName,"activeView"));
				let tableName=viewName;
				//let tableData=this.stock.daftar[viewName].data[0];
				let tableData=this.user.getTableData(tableName);
				let clientKey=this.user.getDbKey();
				this.globalService.getDbKey().subscribe((x:any)=>{
					let dbKey=Number(x.value);
					console.log("TABLEDATA = > ",tableData)
					if(tableData!=null && tableData.length>0 && (clientKey===dbKey)){
						console.log("(tableData!=null && tableData.length>0 && (clientKey===dbKey))",true);
						//this.activeView=tableName;
						this.updateData(tableData,viewName);
					}else{
						console.log("(tableData!=null && tableData.length>0 && (clientKey===dbKey))",false);
						//this.activeView=tableName;
						this.refreshPage(tableName);
					};
				});
			},
			this.gridOptions
		);
	};
	public changeView=async(view:string)=>{
		console.log("===>changeView ",view);
		//console.log("this.stock.daftar[view].colDef ",this.stock.daftar[view].colDef);
		this.activeView=view;
		this.gridOptions.api.deselectAll();
		//this.gridOptions.api.setColumnDefs(null);
		//this.gridOptions.api.setFilterModel(null);
		this.gridOptions.api.setColumnDefs(this.options.data.tableOptions[view].columnDefs);
		this.gridOptions.api.setFilterModel(this.options.data.filterParams[view]);
	};
	public updateData=async(tableData:any,tableName:string)=>{
		await this.stock.set(tableData,tableName,this.options.data.tableOptions);
		
		console.log("===>changeView ",tableName);
		//console.log("this.stock.daftar[view].colDef ",this.stock.daftar[view].colDef);
		
		this.activeView=tableName;
		this.gridOptions.api.deselectAll();
		//this.gridOptions.api.setColumnDefs(null);
		//this.gridOptions.api.setFilterModel(null);
		this.gridOptions.api.setColumnDefs(this.options.data.tableOptions[tableName].columnDefs);
		this.gridOptions.api.setFilterModel(this.options.data.filterParams[tableName]);
	};
	private getPage=(tableName:string)=>{
		this.globalService.getData(tableName).subscribe((x:any)=>{
			console.log("funct getPage var x =>",x)
			if(!!x.data[0].STOCK) x.data.map((item:any)=>item.STOCK=Number(item.STOCK));
			if(!!x.data[0].TANGGAL)x.data.map((item:any)=>item.TANGGAL=this.misc.convertDate(item.TANGGAL));
			let tableData=this.user.setTableData(this.user.getDbKey(),x.data,tableName);
			this.updateData(tableData,tableName);
		});
	};
	public refreshPage=(tableName:string)=>{
		//if(!tableName)tableName=this.activeView;
		try{
			let tableData=this.user.getTableData(tableName)
			let clientKey=this.user.getDbKey();
			this.globalService.getDbKey().subscribe((x:any)=>{
				let dbKey=Number(x.value);
				this.setDbKey(x.value);
				return this.getPage(tableName);
			});
		}catch(e){
			console.log("checkDbParity=()=> dbCheckParity Error : ",e);
		};
	};
}