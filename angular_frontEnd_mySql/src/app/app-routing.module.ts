import { NgModule } from '@angular/core';
import { inject } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { StockComponent } from './stock/stock.component';
import { NmComponent } from './nm/nm.component';
import { XtComponent } from './xt/xt.component';
import { DaftarBarangComponent } from './mu/daftar-barang/daftar-barang.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { APP_BASE_HREF } from "@angular/common";
//import { ImportComponent } from './import/import.component';
//import { DaftarComponent } from './daftar/daftar.component';

let baseHref="";
const dynamicRoutes: Routes = [
	{path: "", redirectTo: '/ag/xt', pathMatch: 'full' },
	{
		path :"ag" , 
		children:[
			{path: "", redirectTo: '/ag/xt', pathMatch: 'full' },
			{path:"stock",component:StockComponent},
			{
				path:"nm",
				children:[
					{path: "", redirectTo: '/ag/nm/lp', pathMatch: 'full' },
					{path:"lp",component:NmComponent},
				],
			},
			{
				path:"mu",
				children:[
					{path: "", redirectTo: '/ag/mu/daftarBarang', pathMatch: 'full' },
					{path:"daftarBarang",component:DaftarBarangComponent},
				],
			},
			{
				path:"xt",component:XtComponent}
			],
	},
	{path : "**",component: NotFoundComponent},
];


@NgModule({
  imports: [RouterModule.forRoot(dynamicRoutes)],
  exports: [RouterModule]
})



export class AppRoutingModule {
	constructor(){
		baseHref=inject(APP_BASE_HREF);
	}
	dynamicRoutes=dynamicRoutes;
};