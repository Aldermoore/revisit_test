// import { ref } from 'firebase/storage';
import { TagPicker } from 'rsuite';
import 'rsuite/styles/index.less'; // or 'rsuite/dist/rsuite.min.css'
import SpinnerIcon from '@rsuite/icons/legacy/Spinner';

import {
  collection, getDocs, addDoc, updateDoc,
  Firestore, query, where,
  limit,
  increment,
} from 'firebase/firestore';
import React, { ReactNode } from 'react';
import { FirebaseStorageEngine } from '../../../storage/engines/FirebaseStorageEngine';

// Firebase Firestore references
const app = new FirebaseStorageEngine();
const db = app.firestore;

// Fieldvariables to keep track of the current task
let oldStimuli = '';
let selectedTags: string[] = [];

// For the tag data
type tagType = { label: string; value: string; };
let data = ['Big dataset', 'Many different shapes', 'Irregular shapes', 'Confusing layout', 'Confusing background', 'Multiple charts', 'Too small', 'Many colors', 'Poor contrast', '3D effect', 'Not complex']
  .map(
    (item) => ({
      label: item,
      value: item,
    }),
  );
const defaultTagsData = ['Big dataset', 'Many different shapes', 'Irregular shapes', 'Confusing layout', 'Confusing background', 'Multiple charts', 'Too small', 'Many colors', 'Poor contrast', '3D effect', 'Not complex'].map(
  (item) => ({
    label: item,
    value: item,
  }),
);

/**
 * Get a list of tags from the specified database
 * @param database Firestore database reference
 * @returns DocumentData[] list of documents in the 'tags' collection of the database
 */
async function getTags(database: Firestore) {
  const tagsCol = collection(database, 'tags');
  const tagsSnapshot = await getDocs(tagsCol);
  const tagsList = tagsSnapshot.docs.map((docu) => docu.data());
  return tagsList;
}

/**
 * Add a new tag to the 'tags' collection of the database
 * @param database Firestore database reference
 * @param newTag String literal of the new tag name
 */
async function addTag(database: Firestore, newTag: string) {
  try {
    const docRef = await addDoc(collection(db, 'tags'), {
      name: newTag,
      count: 1,
    });
    // eslint-disable-next-line no-console
    console.info('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding tag to firebase: ', e);
  }
}

/**
 * Fills in the data variable with data from the Firebase database
 * @param database Firestore database reference
 */
async function getTagsData(database: Firestore) {
  const tagnames: string[] = [];
  const taglist: { tagName: string; count: number; }[] = [];
  getTags(database).then((tagsdata) => {
    tagsdata.forEach((tagdoc) => {
      const tempTagObj = { tagName: 'A', count: 0 };
      taglist.push(tempTagObj);
      tempTagObj.tagName = tagdoc.name;
      tempTagObj.count = tagdoc.count;
    });
    taglist.sort((a, b) => b.count - a.count);
    // eslint-disable-next-line guard-for-in
    for (const i in taglist) { tagnames.push(taglist[i].tagName); }
    // eslint-disable-next-line no-console
    console.info('Fetched documents:', tagnames);
    data = tagnames.map(
      (item) => ({
        label: item,
        value: item,
      }),
    );
  });
}

/**
 * Update the firebase database with the specified tags.
 * If an element in tagList already exists in the database, its value 'count' is incremented by 1.
 * Else the element is added as a new tag, with a count of 1.
 * @param database Firestore database reference
 * @param tagList string[] list of strings
 */
async function updateFirebaseTagList(database: Firestore, tagList: string[]) {
  const tagRef = collection(database, 'tags');
  tagList.forEach((element) => {
    const q = query(tagRef, where('name', '==', element), limit(1));
    getDocs(q).then((querySnapshot) => {
      if (querySnapshot.size > 0) { // If a document exists that mathc the query, we increment its counter
        const docRef = querySnapshot.docs[0].ref;
        // eslint-disable-next-line no-console
        console.info('A document that match the query has been found', docRef);
        // docRef.update('count', Firestore.FieldValue.increment(1));
        updateDoc(docRef, {
          count: increment(1),
        });
      } else { // if it does not exist, then it must mean that the tag does not exist, and we need to add it to the tags document
        // eslint-disable-next-line no-console
        console.info('No document that match the query has been found');
        addTag(db, element);
      }
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Picker({ parameters, setAnswer }: { parameters: any, setAnswer: any }) {
  const stimuli = parameters.stimulusNumber;
  const [items, setItems] = React.useState<tagType[]>([]);
  const updateData = () => {
    const tagnames: string[] = [];
    const taglist: { tagName: string; count: number; }[] = [];
    getTags(db).then((tagsdata) => {
      tagsdata.forEach((tagdoc) => {
        const tempTagObj = { tagName: 'A', count: 0 };
        taglist.push(tempTagObj);
        tempTagObj.tagName = tagdoc.name;
        tempTagObj.count = tagdoc.count;
      });
      taglist.sort((a, b) => b.count - a.count);
      // eslint-disable-next-line guard-for-in
      for (const i in taglist) { tagnames.push(taglist[i].tagName); }
      data = tagnames.map(
        (item) => ({
          label: item,
          value: item,
        }),
      );
      if (items.length === 0) {
        setItems(data);
      }
    });
  };

  // check if the stimuli has been changed, since this indicates that the page has been updated.
  if (stimuli !== oldStimuli) {
    // Setting the answer to false, so the user cannot just skip past the task
    setAnswer({
      status: false,
      provenanceGraph: undefined,
      answers: {
        tags: selectedTags,
      },
    });
    // push the tag list to firebase
    if (selectedTags.length > 0) {
      updateFirebaseTagList(db, selectedTags);
    }
    // retrieve the latest tag list
    getTagsData(db);
    // reset the tag list
    selectedTags = [];
    // eslint-disable-next-line no-console
    console.info('New task, resetting selected tags');
    // updating the old stimuli number
    oldStimuli = stimuli;
  }

  const renderMenu = (menu: ReactNode) => {
    if (items.length === 0) {
      return (
        <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
          <SpinnerIcon spin />
          {' '}
          Loading...
        </p>
      );
    }
    return menu;
  };

  let imgPath = '/visualization-complexity/assets/stimuli/stimulus';
  imgPath = imgPath.concat(stimuli);
  imgPath = imgPath.concat('.jpg');
  return (
    <div className="tagPicker">
      <p>What was the main reasons for choosing this complexity rating? Select the appropriate tags or create a new one.</p>
      <TagPicker
        creatable
        cleanable={false}
        data={items}
        cacheData={defaultTagsData}
        style={{ maxWidth: 800, width: '100%' }}
        // block
        renderMenu={renderMenu}
        onOpen={() => {
          updateData();
        }}
        onCreate={(value) => {
          selectedTags = (value);
        }}
        onSelect={(value) => {
          selectedTags = value;

          if (selectedTags.length > 0) {
            // eslint-disable-next-line no-console
            console.info('Setting the answer to true');
            setAnswer({
              status: true,
              provenanceGraph: undefined,
              answers: {
                tags: selectedTags,
              },
            });
          } else {
            // eslint-disable-next-line no-console
            console.info('No answer given, e.g. they have removed all selections');
            setAnswer({
              status: false,
              provenanceGraph: undefined,
              answers: {
                tags: selectedTags,
              },
            });
          }
        }}
        onTagRemove={(value) => { // onChange
          // eslint-disable-next-line no-console
          console.info(value);
          const newTags = selectedTags.filter((e) => e !== value);
          selectedTags = newTags;
          if (selectedTags.length > 0) {
            // eslint-disable-next-line no-console
            console.info('Setting the answer to true');
            setAnswer({
              status: true,
              provenanceGraph: undefined,
              answers: {
                tags: selectedTags,
              },
            });
          } else {
            // eslint-disable-next-line no-console
            console.info('No answer given, e.g. they have removed all selections');
            setAnswer({
              status: false,
              provenanceGraph: undefined,
              answers: {
                tags: selectedTags,
              },
            });
          }
        }}
      />
      <br />
      <br />
      <img
        className="stimuli"
        style={{ maxWidth: '100%', width: 800, maxHeight: 600 }}
        src={imgPath}
      />
    </div>
  );
}

export default Picker;
