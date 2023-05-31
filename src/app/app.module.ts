import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { NavigationComponent } from './navigation/navigation.component';
import { UploadComponent } from './misc/upload/upload.component';
import { HttpClientModule } from '@angular/common/http';
import { GlobalService } from './service/global/global.service';
import { ImportComponent } from './import/import.component';
import { DaftarComponent } from './daftar/daftar.component';
import { DataTableComponent } from './misc/data-table/data-table.component';

import { AgGridModule } from 'ag-grid-angular';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavigationComponent,
    UploadComponent,
    ImportComponent,
    DaftarComponent,
    DataTableComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
	HttpClientModule,
	AgGridModule
  ],
  providers: [GlobalService],
  bootstrap: [AppComponent]
})

export class AppModule { }